# ADR-0002: Use Vite + React Instead of Next.js

## Status
Accepted

## Context

`ENGINEERING.md` (from the starter pack) specifies Next.js as the frontend
framework. The developer already has working experience with a plain
Vite + React + TypeScript + Tailwind stack from a prior project and
explicitly asked to keep that stack rather than adopt Next.js.

## Decision

Use Vite + React + TypeScript + Tailwind for `apps/web` instead of Next.js.
Everything else in `ENGINEERING.md`'s target architecture is unchanged: FastAPI,
PostgreSQL, Redis, a worker service, and NGINX as the single local entry
point.

## Why

- Matches technology the developer already knows and wants to deepen,
  rather than spending Phase 0 learning a new framework on top of
  everything else in `ENGINEERING.md` §2 (systems-engineering learning goals
  are backend/infra-focused, not "which React meta-framework").
- Next.js's server-rendering/routing features aren't load-bearing for this
  product — the browser talks to FastAPI over a JSON API regardless of
  which frontend tool renders the page. A plain SPA is a legitimate fit.
- Simpler local dev loop (no server components / RSC boundary to reason
  about) while the actual complexity budget for Phase 0 is already high
  (Postgres, Redis, a worker, NGINX, Alembic).

## Consequences

Positive:
- One less new technology to learn simultaneously with Redis/NGINX/worker
  architecture, which are the things `ENGINEERING.md` §2 actually wants
  deepened.
- Vite's dev server and build are fast and simple to reason about.

Negative:
- No built-in SSR/SSG if the product ever wants it (e.g. for SEO on a
  public landing page) — would mean introducing Next.js (or similar)
  later, not a free upgrade path from Vite.
- `packages/game-contracts` and `packages/shared-types` are wired up via
  plain npm workspaces (no monorepo build tool like Turborepo), which is
  fine at this scale but may need revisiting if `apps/web` grows to
  depend on more internal packages with real build steps.

## Trigger to reconsider

Reconsider if the product needs SSR/SSG, or if the npm-workspaces-only
setup becomes a real bottleneck (e.g. once `packages/game-contracts` or
`packages/shared-types` need actual build/publish steps rather than being
consumed as TypeScript source directly).
