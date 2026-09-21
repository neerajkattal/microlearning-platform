# Phase 3 — Simple Quiz UI

What got built, matching `docs/BUILD_PLAN.md`'s Phase 3 list: category
selection, question page, four answer buttons, feedback, results — the
baseline UI before any game mechanics.

## System

```text
App (screen state machine: categories | quiz | results)
  ├── CategorySelect   — GET /categories, "any category" option, click to start
  ├── QuizQuestion     — owns the whole play-through of one session:
  │                        submit answer → feedback → next question → ...
  │                        → complete session on the last question
  └── ResultsScreen    — score/XP/level/streak, play again / back to categories
```

`apps/web/src/api.ts` and `types.ts` now cover the full quiz-session
contract from Phase 2 (previously only had `/health`).

## Design choices worth noting

- **`QuizQuestion` owns the whole session playthrough**, not just one
  question — it tracks the current index internally and calls
  `onComplete` once the last question's result comes back. This keeps
  `App`'s screen state machine to exactly three screens instead of one
  per question.
- **"Play again" replays the same category**, not "any category" — `App`
  tracks `lastCategory` separately from screen state so results → play
  again feels like a retry, not a reset.
- **A failed session start (e.g. an empty category) always lands back on
  the categories screen**, even if it was triggered from "play again" on
  the results screen — there's nowhere sensible to retry from a results
  screen with no session.
- Response time is measured client-side (`Date.now()` at question mount
  vs. at answer click) and sent as `response_time_ms` — the speed bonus
  in Phase 2's scoring is real, not decorative.

## What's real vs. skeleton

25 tests, all passing:
- `api.test.ts` (5): every endpoint function hits the right URL/method/body,
  and a non-ok response throws
- `CategorySelect.test.tsx` (6): loading/error states, category and "any
  category" selection, disabled-when-empty
- `QuizQuestion.test.tsx` (6): submits answers, shows correct/incorrect
  feedback, disables choices after answering, advances questions and
  resets per-question state, completes the session and calls `onComplete`
  on the last question, ignores extra clicks after answering
- `ResultsScreen.test.tsx` (3): renders the score/XP/level/streak
  breakdown, both action buttons fire their callbacks
- `App.flow.test.tsx` (2): a genuine end-to-end simulation through the
  real `App` component — category select → answer → results → back to
  categories, with `fetch` mocked per-URL rather than blanket-mocked

**Known verification gap:** this environment has no display, so the
above was verified by rendering the real components in `jsdom` and
firing real click events (via Testing Library) — not by driving an
actual browser and taking a screenshot. The API side of every request
these tests make was already verified live in Phase 2 (real OpenTDB
content, real Postgres writes). If you want a true click-through
confirmation, open http://localhost:8080 yourself — every category
listed there has questions ingested by Phase 1's worker job.

## Skeleton/placeholder (deliberately)

- No persistent header XP/streak display — that would need a `GET
  /users/me`-style endpoint that doesn't exist yet. Stats are only shown
  on the results screen (from the `/complete` response), which is
  sufficient for Phase 3's scope.
- Fixed `question_count: 5` per session — no UI control for it yet.
- No visual theme/game presentation — this is deliberately plain HTML
  buttons and Tailwind, per `ENGINEERING.md` §8: "games own rendering", and no
  game exists yet. Lane Rush / Balloon Pop (Phase 4/5) are where that
  actually matters.

## Recommended next task

Phase 4 (Lane Rush) — see `docs/BUILD_PLAN.md`: a Phaser scene reusing
this same `/quiz-sessions` API and `QuizQuestion`'s state shape, but with
four lanes and car movement instead of plain buttons.
