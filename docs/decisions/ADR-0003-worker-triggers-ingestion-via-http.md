# ADR-0003: Worker Triggers Ingestion via an Internal HTTP Call, Not Shared ORM Models

## Status
Accepted

## Context

Phase 1 needs the worker to run OpenTDB ingestion on a schedule. The
ingestion logic (fetch, normalize, dedupe, persist) needs the SQLAlchemy
domain models (`Question`, `Answer`, `Category`, `QuestionSource`), which
live in `services/api`. `services/api` and `services/worker` are separate
Python services with their own `requirements.txt` and virtualenvs — there
was no shared package between them going into Phase 1.

Two options:
1. Extract the domain models (and the `QuestionProvider`/`OpenTDBProvider`
   code) into a shared Python package both services install, so the
   worker can call the ingestion logic directly against its own DB
   session.
2. Keep the two services fully independent. The API owns fetch +
   normalize + dedupe + persist behind a `POST /ingestion/opentdb`
   endpoint; the worker just calls that endpoint on a schedule via `httpx`.

## Decision

Option 2. The worker never touches Postgres for ingestion, and never
imports anything from `services/api`. It's a pure scheduler: on its
configured interval, it POSTs to the api's `/ingestion/opentdb` endpoint
and logs the result.

## Why

- No Python packaging work needed (`services/api` and `services/worker`
  both have a top-level package literally named `app`, so sharing code via
  `sys.path` tricks — the pattern already used for Alembic, see
  `docs/learning/alembic-in-a-monorepo.md` — would collide on that name).
- Sharing SQLAlchemy ORM models across two independently-deployed
  processes is a known coupling smell even inside a "modular monolith":
  both services would need to stay in lockstep on model/migration
  versions. An HTTP boundary means the api owns its own persistence layer
  completely; the worker only depends on a stable JSON contract.
- Matches the existing shape of the system: worker and api already talk
  to Postgres/Redis independently and don't share code — this keeps that
  consistent rather than introducing sharing for one feature only.
- The api already owns `QuestionProvider`/`OpenTDBProvider` and the
  security-relevant normalization/dedup logic (Phase 0) — this decision
  keeps content ingestion logic in one place instead of splitting it
  across two services.

## Consequences

Positive:
- Zero new shared-package machinery; each service stays independently
  testable and deployable.
- The ingestion endpoint is independently testable (and was — see
  `services/api/tests/test_ingestion.py` and
  `test_ingestion_endpoint.py`) without needing the worker at all.

Negative:
- The ingestion endpoint (`POST /ingestion/opentdb`) is not authenticated
  yet — there's no auth system until a later phase. It's reachable from
  the browser through NGINX like any other `/api/*` route, bounded only
  by `amount` being capped at 50 per call. Documented as a known gap
  (see `docs/architecture/PHASE_1.md`); real access control is Phase 7
  (production hardening).
- An extra network hop (worker → nginx-fronted api, or worker → api
  directly on the compose network) for something that could theoretically
  be a local function call. Not a real cost at this scale.

## Trigger to reconsider

Reconsider (shared package, option 1) if a second worker-side feature
needs direct model access, making the "one feature, one HTTP call" shape
no longer proportionate — or if internal HTTP latency/reliability becomes
an actual observed problem, not a theoretical one.
