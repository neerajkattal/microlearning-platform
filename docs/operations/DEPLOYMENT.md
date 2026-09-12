# Deployment — Frontend (Vercel) + Backend (Render + Upstash)

How this project is actually deployed live. Everything below reflects what's
really running, not a plan — including a few real gaps in Render's public API
that were discovered by hitting them directly, not assumed from docs.

## Frontend — Vercel (done)

- **Project:** `playtolearn` under the `neerajkattals-projects` Vercel team.
- **Live now at:** `https://playtolearn-five.vercel.app` (Vercel's own domain —
  always works, no setup needed).
- **Custom domain:** `https://playtolearn.neerajkattal.app` — added to the project,
  needs one DNS record at whatever registrar manages `neerajkattal.app`:

  ```
  Type: A
  Name: playtolearn
  Value: 76.76.21.21
  ```

  Run `vercel domains inspect playtolearn.neerajkattal.app` after adding it.
- **Config:** `vercel.json` at the repo root — builds just `apps/web` from the npm
  workspace root (`npm run build -w @microlearning/web`), serves `apps/web/dist`.
- **Redeploy after any change:** `vercel deploy --prod --yes` from the repo root.
- `VITE_API_BASE` (production env var) points at the live Render API URL below.

## Backend — Render (live)

- **API:** `playtolearn-api` (`srv-dai95nm743jc73e7k1mg`), free web service, Docker
  runtime, live at `https://playtolearn-api.onrender.com`.
- **Database:** `playtolearn-db`, free Postgres.
- **No worker/cron service** — see "Why there's no Render worker" below.

Created directly via Render's REST API (not the dashboard Blueprint-apply flow,
though `render.yaml` still describes the same shape and works if applied that way
too).

### Real bugs found running this for real (not in the docs)

1. **`preDeployCommand` doesn't work.** Setting it — both at service-creation time
   and via a follow-up `PATCH` — returned success status codes (201, then 200), but
   the field never appeared in a subsequent `GET` on the service. It silently never
   ran. **Fix:** `infrastructure/docker/api.render.Dockerfile`'s own `CMD` now runs
   `alembic upgrade head` itself before starting uvicorn, so the container
   self-migrates on every boot regardless of platform. Verified locally against a
   throwaway Postgres before trusting it in production.

2. **Render's free tier has no worker or cron job type at all** — confirmed
   directly against the API:
   - Creating a `type: background_worker` on `plan: free` → `400: "only web
     services allowed for plan"`.
   - Creating a `type: cron_job` on `plan: free` → `400: "invalid plan: free.
     valid PaidPlans are [starter, standard, ...]"`.

   So `playtolearn-worker` (in `render.yaml`, from before this was discovered) was
   never actually deployable on the free tier. **Fix:** the worker's only real job
   was calling the API's own `/ingestion/opentdb` endpoint on a schedule (see
   ADR-0003 — the worker never touched the database directly, only HTTP). So
   `.github/workflows/scheduled-ingestion.yml` does exactly that from GitHub
   Actions instead — free, and no separate service to run at all.

3. **Setting an env var via Render's API doesn't restart the container** — not
   even via the explicit `POST /services/:id/restart` endpoint. Confirmed by
   setting `REDIS_URL`, restarting, and watching the new process still connect to
   the old (missing) value in the logs. **Fix that actually works:** trigger a full
   new deploy (`POST /services/:id/deploys`) — that does pick up the current env
   vars. Worth remembering next time any env var changes on a live service.

### Redis — Upstash

Render's own Redis isn't on the free tier, so this uses [Upstash](https://upstash.com)
(serverless, no "sleep" concept, generous free tier). `REDIS_URL` is set as a
single env var on `playtolearn-api` (`rediss://...`). If it's ever rotated, remember
point 3 above — a plain restart isn't enough, trigger a real deploy after.

### Seeding/refreshing questions

There's no long-running worker, so questions arrive by calling the ingestion
endpoint directly — either manually:

```sh
curl -X POST https://playtolearn-api.onrender.com/ingestion/opentdb \
  -H "Content-Type: application/json" -d '{"amount": 50}'
```

or automatically every 6 hours via `.github/workflows/scheduled-ingestion.yml`.

## Wiring the frontend to the real backend URL

```sh
cd /Users/neerajkattal/Neeraj/microlearning-platform
vercel env add VITE_API_BASE production
# paste: https://playtolearn-api.onrender.com
vercel deploy --prod --yes
```

Without this, the deployed frontend calls `/api/...` on its own Vercel domain
(there's no NGINX proxy in this deployment, unlike local Docker Compose) and every
API call fails.

## The "sleep" tradeoff (chosen: free tier + keep-alive ping)

Render's free web-service tier spins down after ~15 minutes of no traffic, then
cold-starts (~30-60s) on the next request. `.github/workflows/keep-alive.yml` pings
`/health` every 10 minutes to keep a real visitor from paying that cost. Not
bulletproof, but free and works well in practice. Upgrading `playtolearn-api` to
`starter` (~$7/month) removes sleep entirely if this ever isn't reliable enough.

**Also worth knowing**: Render's free Postgres plans are typically time-limited
(check Render's current pricing page for the exact window) — a real limitation of
the free-tier choice, worth revisiting if this deployment needs to stay up
long-term.

## Local Docker Compose is unaffected

None of this changes local development — `docker-compose.yml`, `api.Dockerfile`,
`worker.Dockerfile`, and `make up` all still work exactly as before, worker
included (it's a real, still-used service locally — just not deployed to Render).
`api.render.Dockerfile` is a separate, deployment-only image (see the comment at
its top for why it can't reuse the local one) that nothing in local dev touches.
