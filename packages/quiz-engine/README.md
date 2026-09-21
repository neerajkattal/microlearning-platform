# packages/quiz-engine — placeholder

`ENGINEERING.md` lists this as a sibling of `shared-types` and `game-contracts`,
but the Quiz Engine's actual logic (question selection, answer
randomization, sessions, server-side correctness, scoring, XP, streaks —
see `ENGINEERING.md` §3 "Quiz boundary") is **server-authoritative by design**.
It can't live in a browser-shipped TypeScript package without breaking the
security boundary ("the browser must never be trusted to declare an answer
correct").

**Deviation:** the real Quiz Engine implementation lives in
`services/api/app/quiz_engine/` (added in Phase 2, see
`docs/BUILD_PLAN.md`), not here.

This folder is reserved for genuinely client-side quiz *utilities* that
have no security implication if duplicated or tampered with — e.g. a
countdown-timer helper, or client-side answer-order shuffling for
*display* purposes only (the server independently validates whatever the
player submits regardless of what order it was shown in). Nothing here yet.
