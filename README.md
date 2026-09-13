# PlayToLearn

**Live:** [playtolearn-five.vercel.app](https://playtolearn-five.vercel.app)

A full-stack gamified trivia platform. Questions are answered through short
interactive browser games (a lane-dodging runner, a balloon-popping game) instead
of a plain multiple-choice form, backed by a real quiz engine, auth, XP/leaderboard
system, and a live production deployment.

**Stack:** FastAPI (Python) · PostgreSQL · Redis · SQLAlchemy/Alembic · React +
TypeScript · Phaser (game engine) · Docker Compose · deployed on Vercel + Render +
Upstash.

## Highlights

- **Server-authoritative scoring** — the client never sees which answer is correct
  until after it submits; answer order is shuffled per session.
- **Two Phaser game modes** sharing one quiz engine, each split into a pure,
  fully-unit-tested game-logic module plus a thin rendering layer.
- **Real auth, XP, streaks, achievements, and a leaderboard** — JWT + bcrypt,
  server-computed scoring formula (base + difficulty + speed + streak bonuses).
- **Production hardening**: structured JSON logging with request IDs, Redis rate
  limiting on auth endpoints, Redis caching on hot read endpoints, a documented
  self-review that found and fixed a real bug (the rate limiter was keying off the
  reverse proxy's IP instead of the real client's).
- **182 automated tests** (87 backend, 95 frontend) across unit, integration, and
  component-level coverage.
- **Live deployment** — Vercel (frontend) + Render (API, Docker) + Upstash (Redis),
  with a free-tier-aware architecture (a GitHub Actions cron replaces a paid
  background worker, another pings the API to avoid cold starts).

See `CLAUDE.md` for the full engineering constitution, and `docs/START_HERE.md` for
the product/architecture overview.

## Status

Phases 0-7 of the build plan complete (foundation, question ingestion, quiz engine,
two game modes, auth/gamification, production hardening) plus a UI/UX redesign and a
live deployment. See `docs/BUILD_PLAN.md` for the phased roadmap and
`docs/architecture/` for what each phase actually delivered.

## Local setup

Requires Docker, Docker Compose, Node 20+, and Python 3.12 (the last two only for
running things outside Docker — tests, Alembic).

```bash
cp .env.example .env

# Full stack (postgres, redis, api, worker, web, nginx)
make up
# → open http://localhost:8080

# Once postgres is up (via `make up` in another terminal, or `docker compose up postgres`):
make migrate
```

### Running tests / checks without Docker

Each service has its own virtualenv/node_modules; see each service's directory if
you need to set one up from scratch.

```bash
make test        # api + worker + web, all of it
make test-api
make test-worker
make test-web
make typecheck    # shared-types + game-contracts
make build        # production build of apps/web
```

### Ports

| Service | Port | Notes |
|---|---|---|
| nginx | 8080 | single entry point — use this one |
| web (Vite) | 5173 | direct, bypasses nginx |
| api (FastAPI) | 8000 | direct; `/docs` for interactive API explorer |
| postgres | 5432 | exposed for `make migrate` / local psql |

## Docs

- `docs/START_HERE.md` — project overview
- `docs/BUILD_PLAN.md` — phased implementation roadmap
- `docs/architecture/PHASE_0.md` — what Phase 0 actually delivered, known gaps
- `docs/architecture/QUESTION_SYSTEM.md` — Q&A architecture
- `docs/decisions/` — architecture decision records
- `docs/DEFINITION_OF_DONE.md` — delivery quality gate
- `docs/operations/DEPLOYMENT.md` — how the live deployment actually works (Vercel/Render/Upstash, real gaps found and fixed along the way)
- `docs/learning/` — infrastructure learning notes (gitignored, personal)
