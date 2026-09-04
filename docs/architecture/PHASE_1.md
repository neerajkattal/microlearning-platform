# Phase 1 — Question System

What got built, matching `docs/BUILD_PLAN.md`'s Phase 1 list.

## System

```text
worker (scheduled, every opentdb_ingestion_interval_seconds — default 1h,
        plus once immediately on startup)
  ↓ POST /ingestion/opentdb  {amount}
api
  ↓ OpenTDBProvider.fetch_batch (with retry+backoff)
OpenTDB
  ↓ RawQuestion (normalized, HTML-unescaped)
api: get-or-create Category/QuestionSource, content-hash dedup, persist
  ↓
PostgreSQL (Question, Answer rows)
  ↑
GET /questions, GET /questions/{id}, GET /categories  (content-pool
  visibility — no answers/isCorrect exposed; see Known gaps)
```

See ADR-0003 for why the worker calls the api over HTTP instead of
sharing SQLAlchemy models directly.

## What's real vs. skeleton

Real and tested, verified against the live `docker compose` stack (not
just unit tests) — a real ingestion run against the actual OpenTDB API
landed 30 questions / 120 answers in the live Postgres:
- `app/ingestion.py`: get-or-create Category/QuestionSource (idempotent),
  content-hash-based dedup (OpenTDB has no stable question id — see the
  hash rationale in that module), retry-with-backoff around the fetch
  (3 attempts, exponential), per-item malformed-question handling that
  doesn't abort the rest of the batch — 7 tests
- `POST /ingestion/opentdb`: bounded `amount` (1-50), returns a summary
  (fetched/inserted/skipped_duplicate/skipped_malformed/errors) — 2 tests
- `GET /questions`, `GET /questions/{id}`, `GET /categories`: filter by
  category/difficulty, paginated, never return answers — 5 tests
- Worker job scheduling: jobs now run on their own `interval_seconds`
  instead of every 5s poll tick; a failing job logs and is skipped rather
  than crashing the loop — 4 tests, including a regression test for a
  real bug found via live testing (see below)
- `services/worker/app/jobs/ingest_opentdb.py`: triggers the api endpoint
  on schedule, handles connection/HTTP errors without raising — 4 tests

## A real bug, found live

Restarting the worker via `docker compose restart` doesn't rebuild the
image — it kept running the pre-Phase-1 image, which didn't have `httpx`
installed (`ModuleNotFoundError`). Fixed by using
`docker compose up -d --build` instead.

Separately, once that was fixed, the ingestion job still didn't fire on
worker startup. Root cause: the scheduling code used
`last_run.get(name, 0.0)` and compared against `time.monotonic()` to
decide if a job was "due." `time.monotonic()`'s absolute value is
unspecified by Python — it does **not** reliably start near 0 or reliably
start large. In this container it happened to return a small value, so
`now - 0.0 < interval_seconds` came out true on the very first tick and
silently skipped the job's first-ever run. Fixed by tracking "never run"
as `None` instead of a `0.0` sentinel, with a regression test
(`test_first_run_fires_even_when_the_monotonic_clock_starts_small`) that
mocks `time.monotonic()` to a small value to make the failure mode
reproducible in CI regardless of the host clock.

## Skeleton/placeholder (deliberately)

- No auth on `/ingestion/opentdb` — see ADR-0003's Consequences and
  `docs/architecture/PHASE_0.md`. `amount` is capped at 50 but the
  endpoint itself isn't protected yet.
- `/questions*` endpoints are content-pool visibility, not the
  player-facing question fetch — that's Phase 2's Quiz Engine, which owns
  session-scoped answer randomization and answer submission.
- No quality metadata tracking yet (`QuestionStatistics` rows exist in the
  schema from Phase 0 but nothing populates them — that's tied to real
  quiz attempts, Phase 2).

## Recommended next task

Phase 2 (Quiz Engine) — see `docs/BUILD_PLAN.md`: quiz sessions, answer
randomization per session, server-side answer validation against the
`is_correct` column that's never been exposed, scoring/XP/streaks.
