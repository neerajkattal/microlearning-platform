# Security Review — Phase 7

A pass over what actually exists in this codebase as of Phase 7, not a generic
checklist. Every finding below was checked against real code (or verified live
against the running stack), not assumed. Severity is about *this project's actual
deployment* (local Docker, not exposed to the internet) — several findings would be
more severe in a real production deployment, and are flagged as such.

## Findings

### 1. Rate limiter was bucketing every user under NGINX's own IP — FIXED this review

**Severity: High (would have made the Phase 7 rate limiter almost useless in
practice).**

`rate_limit.py` keys its Redis counter on `request.client.host`. NGINX proxies every
`/api/*` request to the `api` container (which has no host port mapping — it's only
reachable through NGINX at all), and by default FastAPI/Starlette report
`request.client.host` as whoever made the raw TCP connection — which is NGINX itself,
not the original browser. Verified live: before the fix, every login attempt through
NGINX produced the identical Redis key `ratelimit:auth:172.22.0.7` (NGINX's own
container IP) regardless of source. In practice, this meant **every real user sharing
one combined rate-limit bucket** — one abusive user could lock out everyone else, and
the limit would trigger far more easily than intended under any real traffic.

**Fix**: `uvicorn.middleware.proxy_headers.ProxyHeadersMiddleware` added as the
outermost middleware in `main.py`, with `trusted_hosts="*"`. NGINX already sends
`X-Real-IP`/`X-Forwarded-For` (`nginx.conf`); this middleware is what makes FastAPI
actually trust and parse them into `request.client.host`. Trusting all hosts here is
safe specifically because the API container has no host port mapping — NGINX is
*structurally* the only thing that can ever connect to it directly, so there's no
untrusted party in a position to spoof these headers. Re-verified live after the fix:
the same request now produces `ratelimit:auth:192.168.65.1` — a real, distinct client
address, not NGINX's.

### 2. Hardcoded fallback JWT secret in source

**Severity: High if ever deployed without override; none currently (local dev only).**

`config.py`: `jwt_secret_key: str = "dev-only-insecure-secret-change-in-production"`.
This is a real, readable-in-source-control fallback. If this project were ever
deployed with the `JWT_SECRET_KEY` environment variable unset, **anyone who has read
this file — which includes anyone who ever clones this repo — could forge a valid
token for any user id.**

**Status: accepted risk for local development, but this is a hard blocker before any
real deployment.** Pre-deployment checklist item: `JWT_SECRET_KEY` must be set to a
real, randomly generated secret via the hosting environment's secret management (not
committed anywhere), before Phase 8 (AWS) ever puts this in front of real users.

### 3. No token revocation / logout-everywhere

**Severity: Low for this project's current scope; a real gap for a production auth
system.**

A JWT, once issued, is valid until its 7-day expiry no matter what — there's no
server-side "this token is no longer valid" list. A stolen token is usable for up to
7 days even after the legitimate user changes their password (there's no password
change flow yet either) or would otherwise want to "log out everywhere."

**Status: explicitly deferred, matching Phase 6's documented scope.** A real fix
(a server-side revocation list in Redis, checked on every request, or moving to
short-lived access tokens + refresh tokens) is real additional complexity not
justified yet by this project's actual risk profile (no real users, local dev).

### 4. `/auth/register`'s 409 response allows username enumeration

**Severity: Low — the same tradeoff virtually every real signup form makes.**

`POST /auth/register` returns a distinct `409 Username is already taken` versus other
failures — which means anyone can check whether a specific username is registered by
attempting to register it. `POST /auth/login`, by contrast, deliberately returns the
same generic `401 Invalid username or password` whether the username doesn't exist or
the password is simply wrong (verified in `test_auth.py`) — no enumeration there.

**Status: accepted, not fixed.** A signup form that doesn't tell you your chosen
username is taken is a genuinely worse user experience, and username enumeration
(distinct from *password* exposure) is a low-severity, industry-standard tradeoff.
Flagging it here as a conscious choice rather than an oversight.

### 5. Frontend dev-tooling vulnerability (`esbuild`/Vite, via `npm audit`)

**Severity: Low for this project's actual exposure.**

`npm audit` reports one moderate advisory: `esbuild <=0.24.2` (pulled in by the
current Vite version) allows any website a developer visits to send requests to, and
read responses from, the Vite **dev server** — [GHSA-67mh-4wv8-2f99]. Fixing it
requires `vite@8`, a breaking major-version upgrade not undertaken in this review.

**Status: accepted for now.** This vulnerability's actual exposure is "a developer
running `npm run dev` while browsing a malicious website, with the dev server
reachable from that browser's network" — this project's dev server runs inside
Docker Compose, reachable only via `localhost:8080` through NGINX in normal use, not
directly exposed to an untrusted network. It does **not** affect the production
build (`npm run build`) at all — `esbuild` is a build-time tool, not a runtime
dependency of the shipped app. Revisit the Vite 8 upgrade at a less disruptive time,
or immediately if this dev server is ever run somewhere network-exposed.

## What's already solid (reviewed, no issues found)

- **SQL injection**: every query goes through SQLAlchemy's query builder or ORM
  (parameterized automatically); the one raw SQL string in the codebase
  (`text("SELECT 1")` in the readiness check) contains no user input at all.
- **Password storage**: `bcrypt` with its own automatic per-password salt
  (`bcrypt.gensalt()`), never a fast/unsalted hash, never plain text — confirmed by
  reading `auth.py` directly and confirmed no plain password is ever logged (the
  request-logging middleware added this phase logs method/path/status/duration only,
  never the request body).
- **CORS**: restricted to a specific origin (`http://localhost:5173`), not a wildcard
  — correct for this environment. Must be updated to whatever the real frontend
  origin is before any real deployment; noted alongside the JWT secret as a
  pre-deployment checklist item.
- **Authorization boundary**: verified live in Phase 6 that a session belonging to
  another user returns 404, not 403 or 200 — no cross-user data leakage found.

## Ongoing recommendation, not a one-time fix

Run `pip list --outdated` / a `pip-audit`-style check on `services/api` and
`services/worker`, and `npm audit` on the frontend, **periodically** — not just once
during this review. A dependency that's safe today can have a CVE disclosed
tomorrow; treating this as a recurring practice (e.g., before each new phase starts)
catches that, where a one-time review at Phase 7 wouldn't.
