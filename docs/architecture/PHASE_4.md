# Phase 4 — Lane Rush

What got built, matching `docs/BUILD_PLAN.md`'s Phase 4 list and
`ENGINEERING.md` §9: the first real game mode. Four answer lanes, a car that
drives forward automatically, and left/right steering to lock in an
answer — running on the exact same `/quiz-sessions` API contract Phase 3
already proved out, with a Classic/Lane Rush choice added so both modes
are reachable from the app.

## System

```text
App (screen state machine: categories | mode-select | quiz | results)
  ├── CategorySelect   — unchanged from Phase 3
  ├── GameModeSelect   — new: Classic vs. Lane Rush, picked after category
  ├── QuizQuestion     — Classic mode, unchanged from Phase 3
  ├── LaneRush          — Lane Rush mode (React wrapper around Phaser)
  │     │
  │     ├── laneRushEngine.ts  — pure state machine, no Phaser/DOM
  │     │     createGameState → start → update(dt) → shiftLane →
  │     │     applyAnswerResult → stop
  │     │
  │     ├── LaneRushScene.ts   — Phaser.Scene: renders engine state to
  │     │     canvas (track, car, gate, answer labels, countdown,
  │     │     correct/wrong feedback), reads keyboard input, emits
  │     │     "answer-locked" / "race-finished" events
  │     │
  │     └── LaneRush.tsx        — owns the Phaser.Game lifecycle, listens
  │           for those two events, calls the real quiz-session API
  │           (submitAnswer / completeQuizSession) and feeds the server's
  │           verdict back into the scene — the scene never decides
  │           correctness itself
  └── ResultsScreen    — unchanged from Phase 3, shared by both modes
```

## Design choices worth noting

- **Pure engine / renderer / React-wrapper split.** `laneRushEngine.ts`
  has no Phaser or DOM dependency at all — it's a plain state-transition
  module (`LaneRushState` in, `LaneRushState` out) that's fully testable
  with plain Vitest. `LaneRushScene.ts` reads that state and draws it.
  `LaneRush.tsx` owns the Phaser game object's lifecycle and is the only
  place that talks to the network. This is the same reason Phase 2 kept
  scoring logic (`quiz_engine/scoring.py`) separate from the FastAPI
  router — the rules are independent of the delivery mechanism.
- **The car's lane picks the answer, not a click.** When a gate reaches
  the car (`GATE_TRAVEL_MS` = 6s per question), the engine reads
  `carLane` and maps it directly to `question.choices[carLane].id` —
  the same shuffled `choices` array the server already returned, so no
  extra randomization logic exists on the client.
- **Server-authoritative correctness, same as Phase 3.** The engine sets
  `pendingResolution` the instant a gate arrives and freezes gate
  movement — it does *not* decide correct/wrong. `LaneRush.tsx` submits
  that pending choice to `POST /quiz-sessions/{id}/questions/{qid}/answer`
  and only calls `scene.applyServerVerdict(is_correct)` once the real
  answer comes back from Postgres. `ENGINEERING.md` §4's security boundary
  ("the browser must never be trusted to declare an answer correct")
  applies exactly as much to a car game as to answer buttons.
- **Response time is measured the same way as Phase 3** — wall-clock
  from when a question's gate becomes current to when the server
  responds — so Phase 2's speed bonus is real here too, not just in the
  classic mode.
- **Stopping mid-verdict doesn't drop an in-flight answer.** `stop()`
  preserves `pendingResolution` as a recorded answer instead of
  discarding it, so the race-finished event's answer count always
  matches the number of gates the player actually passed.
- **Accessibility (`ENGINEERING.md` §11):** feedback is always text
  ("Correct!"/"Wrong"), never color-only — the colored screen flash is
  purely decorative and is skipped entirely when
  `prefers-reduced-motion: reduce` is set. Touch buttons (◀ ▶) sit under
  the canvas for mobile, in addition to arrow-key/AD keyboard controls.
- **`onComplete` is read through a ref, not a dependency**, in
  `LaneRush.tsx`'s game-lifecycle effect — keyed only on `session.id` —
  so a parent re-render that gives `onComplete` a new identity doesn't
  tear down and recreate the whole Phaser game mid-race.

## What's real vs. skeleton

23 new tests (50 total in `apps/web`, all passing):
- `laneRushEngine.test.ts` (18): state creation, start/idle transition,
  lane-shift boundary clamping and blocking (while pending, before
  running), countdown-to-running, gate progress advancing and freezing
  once pending, correct lane→answer mapping, score/advance/finish on
  `applyAnswerResult`, `stop()` preserving an in-flight answer
- `LaneRush.test.tsx` (5): listener registration, submit-answer →
  `applyServerVerdict` wiring (with a mocked API response), complete-session
  → `onComplete` wiring, touch-button wiring, Phaser game teardown on
  unmount — `phaser` and `./game/LaneRushScene` are both mocked at the
  module boundary here, since jsdom has no real canvas/WebGL
- `GameModeSelect.test.tsx` (2): both mode buttons fire the right callback
- `App.flow.test.tsx` and `App.test.tsx` updated for the new mode-select
  step in between category pick and quiz; `phaser` is stubbed there too
  since `App` now imports `LaneRush` eagerly

**Live verification performed this phase:**
- `docker compose up -d --build` from a cold stop, all six containers
  healthy.
- Full API round-trip against the real running stack, in exactly the
  shape `LaneRush.tsx` uses it: `POST /quiz-sessions` → three
  `POST /quiz-sessions/{id}/questions/{qid}/answer` calls (lane→answer
  id mapping done by hand, same as the engine does it) → `POST
  /quiz-sessions/{id}/complete`. Got back a real mixed result (1 wrong,
  2 correct) with real Postgres-computed XP (`44` earned, `91` total,
  streak `2`) — confirms the exact contract Lane Rush depends on works
  against live data, not just the Phase 2 test suite.
- Found and fixed a real deployment bug in the process: the `web`
  service's `web_node_modules` Docker volume (a named volume, so it
  survives image rebuilds) still held the pre-Phaser `node_modules` from
  Phase 0–3, which shadowed the freshly built image layer and made Vite
  fail to resolve `"phaser"` at runtime even though the image itself was
  rebuilt correctly. Fixed by running `npm install` inside the running
  container to refresh the volume, then restarting the dev server —
  confirmed by every Lane Rush module (`LaneRush.tsx`, `LaneRushScene.ts`,
  `GameModeSelect.tsx`, etc.) resolving with `200` through the live Vite
  dev server afterward, and a clean `phaser` dependency-optimization log
  line with no errors.

**Known verification gap**, same as Phase 3: no display in this
environment, so there's no click-through screenshot of the actual canvas
game. What's verified instead: (1) the pure game logic exhaustively via
`laneRushEngine.test.ts`, (2) the React↔Phaser wiring via
`LaneRush.tsx`'s mocked-Phaser tests, (3) every source module in the
Lane Rush path actually loading and transforming without error through
the real running Vite dev server, and (4) the live API contract it
depends on. If you want a true click-through confirmation, open
http://localhost:8080, pick a category, choose "Lane Rush", and drive.

## Skeleton/placeholder (deliberately)

- No Balloon Pop yet (Phase 5, per `docs/BUILD_PLAN.md`) — it will reuse
  `laneRushEngine`'s pattern (pure state machine + Phaser scene + React
  wrapper) but with tap-a-balloon input instead of lane steering.
- No difficulty-based gate speed — `GATE_TRAVEL_MS` is a flat 6s
  regardless of question difficulty. Not in Phase 4's scope.
- No mid-race pause/quit control — leaving the page is the only way to
  abandon a Lane Rush session early (same as Classic mode today).

## Recommended next task

Phase 5 (Balloon Pop) — see `docs/BUILD_PLAN.md`: the second game mode,
reusing the same quiz-session contract and the pure-engine/scene/wrapper
split proven out here, but with click/tap balloon selection instead of
car steering.
