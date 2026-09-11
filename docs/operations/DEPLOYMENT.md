# Deployment — Frontend (Vercel) + Backend (Render + Upstash)

How this project is actually deployed live, and the exact manual steps needed to
finish it. Frontend deployment is done (Claude has direct Vercel CLI access); backend
needs a few manual steps since Claude has no Render/Upstash account access.

## Frontend — Vercel (done)

- **Project:** `playtolearn` under the `neerajkattals-projects` Vercel team.
- **Live now at:** `https://playtolearn-five.vercel.app` (Vercel's own domain — always
  works, no setup needed).
- **Custom domain:** `https://playtolearn.neerajkattal.app` — added to the project,
  but needs one DNS record added at whatever registrar/DNS provider manages
  `neerajkattal.app`:

  ```
  Type: A
  Name: playtolearn
  Value: 76.76.21.21
  ```

  Run `vercel domains inspect playtolearn.neerajkattal.app` after adding it — Vercel
  auto-verifies and emails you once it's live (can take a few minutes to a few hours
  depending on DNS propagation).
- **Config:** `vercel.json` at the repo root — builds just `apps/web` from the npm
  workspace root (`npm run build -w @microlearning/web`), serves `apps/web/dist`.
- **Redeploy after any change:** `vercel deploy --prod --yes` from the repo root.

## Backend — Render (needs your manual setup)

Render hosts the API (web service), the worker (background service), and Postgres.
Claude has no Render account/API credentials — these steps need you, once:

1. **Create a free Render account** at render.com, connect your GitHub account, and
   grant it access to the `microlearning-platform` repo.
2. **New + → Blueprint** → select this repo. Render reads `render.yaml` at the repo
   root automatically and proposes: a `playtolearn-db` Postgres database, a
   `playtolearn-api` web service, and a `playtolearn-worker` background worker. Click
   **Apply**.
3. Render will build both Docker images (`infrastructure/docker/api.render.Dockerfile`
   and the existing `infrastructure/docker/worker.Dockerfile`) and provision Postgres.
   The API's `preDeployCommand` runs `alembic upgrade head` automatically on every
   deploy — the schema comes up already migrated, no manual migration step needed.
4. **Redis — Render's own Redis isn't on the free tier**, so this project uses
   [Upstash](https://upstash.com) instead (serverless Redis, generous permanent free
   tier, and — usefully — no "sleep" concept at all, since it's not a persistent
   server you're renting, just a managed endpoint billed per request):
   - Create a free Upstash account, create a Redis database (pick a region close to
     Render's, e.g. US East to match Render's default).
   - Copy its `rediss://` connection URL.
   - In the Render dashboard, set `REDIS_URL` to that value on **both**
     `playtolearn-api` and `playtolearn-worker` (the blueprint deliberately leaves
     this one env var for you to fill in manually — `sync: false` in `render.yaml`).
5. **Confirm the API's real public URL** — Render assigns `https://<service-name>.
   onrender.com` by default, so `playtolearn-api` should land at
   `https://playtolearn-api.onrender.com`. Double check this in the Render dashboard;
   if Render assigned something slightly different (e.g. the name was taken), update:
   - `API_BASE_URL` on `playtolearn-worker` (in Render's dashboard)
   - `.github/workflows/keep-alive.yml`'s ping URL
   - the `VITE_API_BASE` step below

## Wiring the frontend to the real backend URL

Once the Render API is live, tell the frontend where it actually is:

```sh
cd /Users/neerajkattal/Neeraj/microlearning-platform
vercel env add VITE_API_BASE production
# paste: https://playtolearn-api.onrender.com
vercel deploy --prod --yes
```

Until this is set, the deployed frontend will try to call `/api/...` on its own
Vercel domain (there's no NGINX proxy in this deployment, unlike local Docker Compose)
and every API call will fail — this is expected until this step is done.

## The "sleep" tradeoff (chosen: free tier + keep-alive ping)

Render's free web-service tier spins down after ~15 minutes of no traffic, then
cold-starts (~30-60s) on the next request. `.github/workflows/keep-alive.yml` pings
`/health` every 10 minutes to keep real visitors from paying that cost. This isn't
bulletproof — Render can still enforce sleep under some conditions — but costs
nothing and works well in practice. If it turns out not to be reliable enough,
upgrading `playtolearn-api`'s plan in `render.yaml` from `free` to `starter`
(~$7/month) removes the sleep behavior entirely; the worker and database can likely
stay on free/cheap tiers regardless, since nobody's waiting on them in real time.

**Also worth knowing**: Render's free Postgres plans are typically time-limited (check
Render's current pricing page for the exact expiration window at the time you're
reading this) — this is a real limitation of the free-tier choice, not a mistake, and
worth revisiting (upgrading the database specifically) if this deployment needs to
stay up long-term.

## Local Docker Compose is unaffected

None of this changes local development — `docker-compose.yml`, `api.Dockerfile`, and
`make up` all still work exactly as before. `api.render.Dockerfile` is a separate,
deployment-only image (see the comment at its top for why it can't just reuse the
local one) that nothing in local dev touches.
