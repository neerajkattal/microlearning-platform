# Phase 5 — Balloon Pop

What got built, matching `docs/BUILD_PLAN.md`'s Phase 5 list and `CLAUDE.md` §9: the
second game mode. Four answer balloons in a 2x2 grid — tap (or press 1-4) to pop the
one you think is right — running on the exact same `/quiz-sessions` API contract Lane
Rush and Classic mode already use, with no backend changes at all.

## System

```text
App (screen state machine: categories | mode-select | quiz | results)
  ├── GameModeSelect   — now three options: Classic / Lane Rush / Balloon Pop
  ├── QuizQuestion, LaneRush — unchanged from Phases 3-4
  └── BalloonPop        — new: React wrapper around Phaser
        │
        ├── balloonPopEngine.ts  — pure state machine, no Phaser/DOM
        │     createGameState → start → update(dt) → popBalloon →
        │     applyAnswerResult → stop
        │
        ├── BalloonPopScene.ts   — Phaser.Scene: renders engine state to
        │     canvas (question banner, HUD, four balloons with answer
        │     text, pop animation, countdown, correct/wrong feedback),
        │     reads click/tap and 1-4 keyboard input, emits
        │     "answer-locked" / "game-finished" events on the
        │     *game-level* event bus
        │
        └── BalloonPop.tsx        — owns the Phaser.Game lifecycle,
              listens for those two events, calls the real quiz-session
              API (submitAnswer / completeQuizSession) and feeds the
              server's verdict back into the scene
```

## Design choices worth noting

- **Same pure-engine / renderer / React-wrapper split as Lane Rush**, for
  the same reason: `balloonPopEngine.ts` has zero Phaser/DOM dependency,
  is fully testable with plain Vitest (16 tests), and the scene/wrapper
  layers are each responsible for exactly one thing (drawing input vs.
  network calls).
- **The Lane Rush timing bug was applied as a lesson from the start, not
  rediscovered.** Real Phaser adds/boots scenes asynchronously — Lane
  Rush originally called `game.scene.getScene(key)` immediately after
  `game.scene.add(...)` and crashed on mount, because the scene doesn't
  exist synchronously yet (`docs/learning/TROUBLESHOOTING.md #9`).
  `BalloonPopScene` emits its two events on `this.game.events` (the
  Game-level bus, which exists the instant `new Phaser.Game(...)`
  returns) from the very first draft, and `BalloonPop.tsx` looks up the
  actual scene instance lazily inside the event callbacks — never
  synchronously right after `add()`. This was verified against a real
  headless browser (not just mocked unit tests) *before* declaring the
  phase done, specifically because mocked tests didn't catch the
  equivalent bug in Lane Rush.
- **No travel/progress state in the engine, unlike Lane Rush's gates.**
  Balloons don't move toward the player — the only thing that needs to
  advance over time is the pre-round countdown. `update()` is
  correspondingly simpler than Lane Rush's: it drives the countdown and
  otherwise does nothing once the round is `"running"`.
- **Two independent, equally real input paths**: tapping/clicking a
  balloon directly on the canvas (via a `Phaser.GameObjects.Zone` per
  balloon, positioned over each balloon's fixed grid cell), pressing
  keys `1`-`4`, and numbered on-screen touch buttons (`◀ ▶`'s
  equivalent for a 4-choice game) for players who can't/don't want to
  tap the canvas. All three ultimately call the same `popBalloon`
  engine function, so there's exactly one code path deciding "was this
  a valid pop," regardless of which input triggered it.
- **Full screen support included from the start** (Lane Rush gained
  this after the fact, in response to feedback) — same Phaser Scale
  Manager (`FIT` + `CENTER_BOTH`) pattern, toggle button shown only when
  `game.scale.fullscreen.available`.
- **Accessibility (`CLAUDE.md` §11)**: feedback is always text
  ("Correct!"/"Wrong"), never color-only; the screen flash and pop-tween
  animation are both skipped under `prefers-reduced-motion: reduce`
  (the pop still resolves instantly, just without the tween).

## What's real vs. skeleton

22 new tests (74 total in `apps/web`, all passing):
- `balloonPopEngine.test.ts` (16): state creation, start/idle transition,
  countdown-to-running, popping a balloon locks in the right answer id,
  blocked while not running / already pending / out-of-range index,
  score/advance/finish on `applyAnswerResult`, `stop()` preserving an
  in-flight pop
- `BalloonPop.test.tsx` (6): listener registration, submit-answer →
  `applyServerVerdict` wiring, complete-session → `onComplete` wiring,
  numbered touch-button wiring, Phaser game teardown on unmount, full
  screen toggle
- `GameModeSelect.test.tsx` updated (+1): the new Balloon Pop button
  fires the right callback

**Live verification performed this phase, learning directly from Lane
Rush's gap** — this time done *before* declaring the phase finished,
not after a user hit a crash:
- Full headless-browser (Puppeteer) run against the real running Docker
  stack: category → mode-select → Balloon Pop → a real game mounts with
  a real `<canvas>`, zero console/page errors.
- Screenshot-verified the actual rendering: question banner showing the
  real prompt, live "Question X/5" and "Score: N" HUD, four
  distinctly-colored balloons with real answer text and number badges.
- Two separate full automated play-throughs, each popping balloons via
  a *different* real input path (direct canvas taps computed from the
  scene's actual layout constants, and the numbered fallback buttons),
  both reaching the results screen with real Postgres-computed XP/level/
  streak.
- Full screen button confirmed present and clickable with no error.

**Known verification gap**, same as every prior phase: no display in
this environment, so there's no human-eyeball click-through — verified
instead via the layers above (pure engine tests, mocked-Phaser wrapper
tests, and a real headless browser actually playing a full game). If you
want a true human click-through, open http://localhost:8080, pick a
category, choose "Balloon Pop", and play.

## Skeleton/placeholder (deliberately)

- No difficulty-based countdown/round timing — `COUNTDOWN_MS` is a flat
  3s regardless of question difficulty, matching Lane Rush's flat gate
  speed. Not in Phase 5's scope.
- No "reveal the correct balloon" visual when wrong — feedback is just
  the text banner, matching Lane Rush's scope; showing which balloon
  *was* correct would need passing `correct_answer_id` through to the
  scene, which neither game does yet.
- No mid-round pause/quit control, same as both other modes today.

## Recommended next task

Phase 6 (Gamification) — see `docs/BUILD_PLAN.md`: achievements, a real
user stats page, and a leaderboard. This is also the first feature that
would genuinely require solving the "no auth system" gap documented in
`docs/learning/INFRASTRUCTURE.md` §7 — a leaderboard needs to know
*whose* score is whose, which the current single hardcoded `test_user`
can't support.
