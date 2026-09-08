# Phase 6 — Gamification (Auth, Achievements, Stats, Leaderboard)

What got built, matching `docs/BUILD_PLAN.md`'s Phase 6 list. This phase required
solving a real blocker first: a leaderboard needs to know *whose* score is whose, and
until now every request ran as a single hardcoded `test_user`
(`docs/learning/INFRASTRUCTURE.md §7` documented this gap honestly back in Phase 5).
So Phase 6 starts with a minimal real auth system, then builds achievements, a
persistent stats page, and a leaderboard on top of real per-user identity.

## System

```text
Browser
  │ (no token)                         │ (has a token)
  ▼                                     ▼
LoginScreen ──register/login──►    App: checking-auth ──GET /users/me──► categories
  │                                     │  (validates the stored token, gets username)
  └────────────► stores JWT in localStorage (apps/web/src/auth.ts)

Every subsequent request (apps/web/src/api.ts):
  Authorization: Bearer <jwt>  ──►  get_current_user dependency  ──►  real User row
                                     (services/api/app/auth.py)

Quiz session endpoints now require auth and check ownership:
  POST /quiz-sessions            (creates a session owned by the caller)
  GET/POST /quiz-sessions/{id}/* (404s — not 403 — if you don't own it)

On session complete (services/api/app/quiz_engine/sessions.py):
  scoring (Phase 2, unchanged) → check_and_award_achievements() → response
                                   (services/api/app/achievements.py)

New read endpoints (services/api/app/routers/users.py):
  GET /users/me       — your own stats + earned achievements
  GET /leaderboard     — top users by XP, across everyone
```

## Design choices worth noting

- **Passwords are hashed with `bcrypt`, never stored or logged in plain
  text** — `hash_password`/`verify_password` in `services/api/app/auth.py`. Tokens are
  signed JWTs (`pyjwt`, HS256) carrying just `{"sub": user_id, "exp": ...}` — no
  refresh-token flow, a flat 7-day expiry, which is a deliberately minimal scope for a
  local dev project, not a production-grade session system.
- **Session ownership mismatch returns 404, not 403.** `get_session(db, session_id,
  owner_id=...)` raises the exact same `SessionNotFoundError` whether the session
  doesn't exist at all or belongs to someone else — verified live (see below) with a
  real second user. This avoids an ID-enumeration side channel: a 403 would confirm
  "this session exists, you just can't see it," which is more information than an
  attacker should get from an ID they don't own.
- **Achievements are a small registry, same shape as the worker's `JOB_REGISTRY`
  and ingestion's `get_or_create_*` pattern** — `ACHIEVEMENT_DEFINITIONS` is a flat
  list, `_qualifies()` is one function with one branch per achievement, and
  `get_or_create_achievement` lazily creates the DB row for a definition the first
  time it's actually earned by anyone. Adding a new achievement later means one new
  list entry and one new `if` branch — nothing else changes.
- **`UserAchievement`'s existing unique constraint (from Phase 0) does the real
  work of preventing double-awards** — `check_and_award_achievements` also checks
  in-memory before awarding, but the database constraint is what actually guarantees
  it under concurrent requests, the same "trust the database, not just the
  application code" principle the Phase 2 `AnswerAttempt` uniqueness relies on.
- **The frontend validates a stored token on every app load**, via `GET /users/me`
  in a `checking-auth` screen state — rather than trusting a stored JWT blindly until
  the first quiz-session call happens to 401. A `401` anywhere clears the token
  (`api.ts`'s `UnauthorizedError`) and the screen state machine bounces back to
  `LoginScreen`.
- **Achievements earned are surfaced in two places**: the `complete-session` response
  (`achievements_earned`, shown as an "Achievement unlocked!" banner right on the
  results screen — the moment it actually happened) and persistently on the new Stats
  page (`GET /users/me`) for ones earned in the past.

## What's real vs. skeleton

19 new/changed backend tests (74 total in `services/api`), 20 new frontend tests (93
total in `apps/web`), all passing:
- `test_auth.py` (8): register, duplicate-username 409, too-short-password 422,
  login success/wrong-password/unknown-user, a protected endpoint rejecting a missing
  or invalid token
- `test_achievements.py` (5): first-win, perfect-score's 3-question minimum, streak/
  level/XP thresholds, an already-earned achievement never re-awarded
- `test_users_router.py` (4): fresh-user zeroed stats, auth requirement, leaderboard
  ordering, leaderboard `limit` param
- `test_quiz_sessions.py` / `test_quiz_router.py` updated for real per-user
  ownership, including two new tests proving a session is invisible (404) to anyone
  but its owner
- `LoginScreen.test.tsx` (3), `StatsPage.test.tsx` (4), `LeaderboardPage.test.tsx` (4):
  loading/error/loaded states, back-button wiring
- `api.test.ts` additions: register/login requests, Authorization header attached
  once a token exists and omitted when it doesn't, a 401 both throwing
  `UnauthorizedError` and clearing the stored token
- `App.test.tsx` / `App.flow.test.tsx` updated to simulate an already-authenticated
  session (mocking `./auth`) rather than exercising the login screen there —
  `LoginScreen.test.tsx` already owns that

**Live verification performed this phase:**
- Full backend flow via real HTTP calls against the live Docker stack: register two
  users, confirm duplicate-username/wrong-password/missing-token/invalid-token all
  return the right status codes, confirm user B gets a 404 fetching user A's session
  (not a 403 — proving the "don't leak existence" design choice actually behaves that
  way), a full session played through OpenTDB-sourced real questions with a mixed
  score, `first_win` achievement correctly appearing in both the complete-session
  response and `GET /users/me` afterward, and `GET /leaderboard` correctly ordered by
  XP across every registered user.
- Full frontend flow via a real headless browser (Puppeteer): landed on the login
  screen with no stored token, registered a brand-new user, was auto-logged-in straight
  to the categories screen, username visible in the header, played a full Classic quiz
  to the results screen, navigated to "My Stats" and saw real persisted XP/level/
  streak, navigated to "Leaderboard" and saw every registered user correctly ranked —
  zero console/page errors the entire way through.
- Found and fixed a real infra issue while rebuilding for this phase's new backend
  dependencies (`bcrypt`, `pyjwt`): after `docker compose up -d --build api worker`
  recreated the `api` container, NGINX kept returning `502 Bad Gateway` — it had
  cached the old container's IP from Docker's embedded DNS and never re-resolved
  `api` to the new one. Fixed with `docker compose restart nginx`. Documented in full
  in `docs/learning/TROUBLESHOOTING.md`.

**Known verification gap**, consistent with every prior phase: no human eyeball
click-through in this environment — verified instead via the layers above (unit
tests, and a real headless browser actually registering, playing, and navigating).

## Skeleton/placeholder (deliberately)

- **No password reset, no email verification, no refresh tokens.** A 7-day flat JWT
  expiry is the entire session-lifetime story — logging in again is the only way to
  get a new token once one expires. Adequate for a local dev/portfolio project, not
  for production.
- **No rate limiting on `/auth/login` or `/auth/register`** — brute-force protection
  is explicitly scoped to Phase 7 ("Production hardening"), not this phase.
- **Achievements are checked only at session-complete time**, not continuously — an
  achievement whose condition becomes newly true from something other than completing
  a session (there isn't one yet, but a hypothetical future one) wouldn't fire until
  the next completed session.
- **The leaderboard has no time window (all-time only)** and no pagination beyond a
  flat `limit` query param — a "this week" view or infinite-scroll leaderboard isn't
  built.

## Recommended next task

Phase 7 (Production hardening) — see `docs/BUILD_PLAN.md`: structured logging, request
IDs, rate limiting (the `/auth/*` endpoints built this phase are the most obvious
candidates), the first real use of Redis for caching instead of just a health-check
ping, worker retries, backups, and a security review — a natural next step now that
real user accounts and passwords actually exist to secure.
