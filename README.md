# Microlearning Platform

A production-oriented gamified microlearning platform. Users answer multiple-choice
questions through short interactive games (Lane Rush, Balloon Pop), backed by a
shared question/quiz system that's independent of any single game's presentation.

See `CLAUDE.md` for the full engineering constitution, and `docs/START_HERE.md` for
the product/architecture overview.

## Status

Phase 0 (foundation) complete. See `docs/architecture/PHASE_0.md` for what's actually
built vs. skeleton, and `docs/BUILD_PLAN.md` for the phased roadmap.

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
- `docs/operations/` — runbooks (populated in later phases)
- `docs/learning/` — infrastructure learning notes
