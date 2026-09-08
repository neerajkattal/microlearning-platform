# Phase 7 — Production Hardening

What got built, matching `docs/BUILD_PLAN.md`'s Phase 7 list: structured logging,
request IDs, rate limiting, Redis actually doing real work for the first time, worker
retries, backups, and a security review — the last of which found and fixed a real
bug in this very phase's own rate limiter before it ever shipped.

## System

```text
Every API request:
  ProxyHeadersMiddleware (rewrites request.client from X-Forwarded-For, trusting
      NGINX — the only thing that can reach this container at all)
    → CORSMiddleware
      → RequestLoggingMiddleware (assigns/reuses a request id, logs one structured
          JSON line per request, echoes X-Request-ID back)
        → route handlers, some behind rate_limit() (Depends), some using
          cached_json() against Redis

Redis, for the first time actually used for more than a health-check ping:
  ratelimit:auth:<client-ip>       — fixed-window counter, 5/60s, /auth/login+register
  cache:categories                  — 5 min TTL
  cache:leaderboard:limit:<n>       — 30s TTL

Worker (services/worker/app/jobs/ingest_opentdb.py):
  trigger_opentdb_ingestion() — now retries up to 3x with exponential backoff
  instead of giving up silently on one failed HTTP call to the api

Makefile:
  make backup   — pg_dump the running postgres container to backups/ (gitignored)
  make restore  — drop+recreate the public schema, restore from a given dump file
```

## Design choices worth noting

- **The security review found a real bug in this phase's own new code, not just
  pre-existing issues.** The rate limiter (built earlier in this same phase) keyed
  its Redis counter on `request.client.host` — which, since the `api` container has
  no host port mapping and NGINX is the only thing that can ever connect to it
  directly, was NGINX's own container IP on every request, not the real client's.
  Verified live before the fix: every login attempt through NGINX produced the
  identical Redis key regardless of source, meaning every real user would have
  shared one combined rate-limit bucket. Fixed with
  `uvicorn.middleware.proxy_headers.ProxyHeadersMiddleware` (already available —
  `uvicorn` was already a dependency, no new one added), trusting all direct peers
  specifically *because* the container topology guarantees the only direct peer is
  NGINX. Verified live again after the fix (the same request now produces a real,
  distinct client IP), and a regression test using an explicit `X-Forwarded-For`
  header now proves two different forwarded IPs get independent limits. Full
  writeup: `docs/operations/SECURITY_REVIEW.md` and
  `docs/learning/TROUBLESHOOTING.md #11`.
- **Rate limiting is a fixed-window counter, not a sliding window** — `INCR` a
  Redis key, set it to expire on the first hit, reject once the count exceeds the
  limit. This can allow a short burst right at a window boundary (e.g. 5 requests at
  0:59 and 5 more at 1:00), which a true sliding-window log would prevent. Chosen
  anyway: it's a few lines of code against one Redis key instead of a sorted-set-based
  log, and "stop naive credential-stuffing" doesn't need the stricter guarantee.
- **Caching has no invalidation-on-write, by design.** A new leaderboard entry
  doesn't proactively clear `cache:leaderboard:*` — both cached endpoints use a short
  TTL specifically so staleness bounded by that TTL is an accepted tradeoff rather
  than something that needs its own invalidation logic. `/categories` gets a much
  longer TTL (5 min) than `/leaderboard` (30s) because it changes far less often — it
  only changes when the scheduled ingestion job runs, not on every quiz completion.
- **Structured logging matches the format the worker already used since Phase 0** —
  one consistent JSON shape across both processes
  (`{"time":...,"level":...,"msg":...}`), rather than inventing a second format for
  the API. A request id is generated per request (or reused from an incoming
  `X-Request-ID` header, e.g. from a future upstream that already assigns one) and
  echoed back as a response header, so a user-reported issue can be matched to an
  exact server-side log line.
- **The worker's retry lives one level above the ingestion pipeline's own retry.**
  `run_ingestion`'s `_fetch_with_retry` (Phase 1) already retries the actual OpenTDB
  HTTP call. What had no retry was the worker's own call *to the api* triggering that
  pipeline — exactly the call that failed for real once already (the connection-
  refused race documented in `TROUBLESHOOTING.md #7`, when the api container was
  still starting up right after a rebuild). Same exponential-backoff shape as
  `_fetch_with_retry`, at the layer that was actually missing it.
- **Backups are a plain-SQL `pg_dump`, not a custom-format binary dump** — restorable
  with nothing but `psql`, human-inspectable, no version-matched `pg_restore` binary
  required. The tradeoff (larger file, slower restore at scale) doesn't matter yet at
  this project's size.

## What's real vs. skeleton

7 new backend tests for logging/rate-limiting/caching-behavior verification, plus
updates across existing suites (86 total in `services/api`, up from 74; 14 in
`services/worker`, unchanged in count but rewritten for the new retry behavior):
- `test_request_logging.py` (3): every response gets a request id, a client-supplied
  one is echoed back, different requests get different ids
- `test_rate_limit.py` (5): allows up to the limit, blocks past it with
  `Retry-After`, register/login share one bucket, **and a regression test proving
  two different `X-Forwarded-For` values get independent limits** — the exact bug
  the security review found, now covered so it can't silently return
- `test_cache.py` (3): computes-and-caches on a miss, returns cached without
  recomputing on a hit, different keys cached independently
- `test_questions_endpoint.py` / `test_users_router.py`: one new test each proving
  `/categories` and `/leaderboard` actually serve stale (cached) data after the
  underlying rows change directly in the database, bypassing the API
- `test_ingest_opentdb.py`: rewritten to mock `time.sleep`, with new tests for
  "retries then succeeds," "gives up after max retries," and the existing
  never-raises tests preserved

**Live verification performed this phase** (against the real running Docker stack,
not just unit tests):
- Confirmed `X-Request-ID` present on every response and correctly echoed back when
  supplied; confirmed the corresponding structured JSON log lines in `docker compose
  logs api`.
- Confirmed `/categories` produces an actual Redis key (`cache:categories`, real TTL,
  real cached JSON) — not just "the response looked the same," which could also
  happen by coincidence with an unchanged database.
- Confirmed the rate limiter live end-to-end: cleared Redis, hit `/auth/login` 6
  times rapidly, got `401` (wrong credentials) for the first 5 and `429` with a
  `Retry-After: 60` header on the 6th.
- Confirmed the worker still runs cleanly (no regressions) after the retry-logic
  rewrite.
- Confirmed `make backup` produces a real, valid `pg_dump` (135KB, `COPY` blocks for
  all 13 tables including `alembic_version`) against the live database.
- The security review's central finding (the rate limiter's IP bug) was itself found
  and fixed via live verification, not code reading alone — see above.

**Known verification gap**: `make restore` was reviewed but not executed against the
live dev database, since it's destructive (drops the `public` schema) and there was
no need to actually wipe real accumulated local data just to prove `psql < file.sql`
works — that mechanism is standard enough to trust without a live destructive test.

## Skeleton/placeholder (deliberately)

- No sliding-window rate limiting (see "fixed window" note above) — a burst right at
  a window boundary can exceed the intended rate slightly.
- No cache invalidation on write — by design, not an oversight (see above).
- No automated/scheduled backups, and no off-host backup copy (e.g. S3) — `make
  backup` is a manual, on-demand operation. Real automation is a Phase 8 (AWS)
  concern, once there's a real deployment where losing the only copy on one machine
  would actually matter.
- The JWT secret's dev-only hardcoded fallback (`config.py`) and the CORS origin
  (hardcoded to `http://localhost:5173`) are both explicitly flagged in
  `SECURITY_REVIEW.md` as pre-deployment blockers, not fixed now — there's no real
  deployment yet for either to matter to.

## Recommended next task

Phase 8 (AWS) — see `docs/BUILD_PLAN.md`: the first real deployment environment. This
is exactly where the two deferred security items above (a real `JWT_SECRET_KEY` via
proper secret management, and a real CORS origin) stop being deferrable, and where
this phase's backup runbook would get extended with real off-host storage and
scheduling.
