# Phase 0 — Foundation

What actually got built, matching `docs/CLAUDE_FIRST_PROMPT.md`'s deliverable list.

## System

```text
Browser
  ↓
NGINX (infrastructure/nginx/nginx.conf, single local entry point on :8080)
  ├── /api/*  → api:8000   (FastAPI)
  └── /*      → web:5173   (Vite dev server)

api  → PostgreSQL (via SQLAlchemy)
     → Redis (readiness check only, so far)

worker → PostgreSQL, Redis (connectivity-check loop; no real jobs yet)
```

Vite + React replaced this pack's original Next.js default — see ADR-0002.

## What's real vs. skeleton

Real and tested:
- `apps/web`: Vite + React + TS + Tailwind, health-check page, 3 tests
- `services/api`: FastAPI, `/health` (liveness) + `/ready` (readiness —
  actually checks Postgres and Redis), 12 tests
- `services/worker`: connectivity-check loop with graceful shutdown, 5 tests
- Domain models: all 12 entities from `CLAUDE.md` §7, with real constraints
  (unique source+source_question_id for dedup, one attempt per session
  question, one achievement per user) — 9 tests
- Initial Alembic migration, verified end-to-end against both a temporary
  SQLite database (upgrade + downgrade) and the real containerized
  Postgres via `make migrate` (upgrade only, all 13 tables confirmed via
  `psql \dt`)
- Full `docker compose up` stack: all five services (postgres, redis, api,
  worker, web, nginx) come up and reach `running`/`healthy`. Verified the
  actual request chain, not just container status: `GET :8080/` (nginx →
  web) returns 200, `GET :8080/api/health` and `:8080/api/ready` (nginx →
  api → Postgres + Redis) both return the correct payload, and the worker's
  logs show real `database=True redis=True` connectivity checks against
  the containerized services
- `QuestionProvider` interface + `OpenTDBProvider` skeleton: fetches one
  batch, normalizes/unescapes HTML entities — 3 tests. Not yet: retries,
  rate-limit handling, deduplication, persistence (Phase 1)
- `packages/shared-types` and `packages/game-contracts`: real npm
  workspace packages, typecheck cleanly, `game-contracts` imports from
  `shared-types` across the workspace boundary

Skeleton/placeholder (deliberately, per `CLAUDE.md` §18 — foundation only):
- `packages/quiz-engine`, `packages/question-sources/opentdb`: READMEs
  only, explaining why the real logic lives server-side (see those
  READMEs for the reasoning)
- `services/worker`'s job registry (`app/jobs/`) is empty — no ingestion
  job yet, that's Phase 1
- No Lane Rush, no Balloon Pop, no auth, no AWS, no Kubernetes — all
  explicitly out of scope for this milestone

## Known gaps

- CI workflows (`.github/workflows/*.yml`) are written and YAML-validated
  but haven't run on actual GitHub Actions yet — that only happens once
  this is pushed.
- The Alembic migration's Postgres run only exercised `upgrade`, not
  `downgrade` (downgrade was verified on SQLite only). Low risk — it's a
  straightforward set of `create_table`/`drop_table` pairs with no
  Postgres-specific types — but worth a real `alembic downgrade base` /
  `upgrade head` cycle against Postgres before relying on downgrades in
  anger.

## Recommended next task

Phase 1 (Question system) — see `docs/BUILD_PLAN.md`: turn the
`OpenTDBProvider` skeleton into a real ingestion job the worker runs on a
schedule, with retries, deduplication, and persistence into the domain
models already in place.
