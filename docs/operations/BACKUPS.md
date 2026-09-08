# Backups & Restore

## Taking a backup

```sh
make backup
```

Runs `pg_dump` inside the running `postgres` container and writes a timestamped
plain-SQL dump to `backups/` on the host (that directory is gitignored — dumps may
contain real user data, even if it's just local test accounts, and don't belong in
version control).

Requires the stack to be running (`make up` / `docker compose up -d`) — `pg_dump`
runs *inside* the `postgres` container via `docker compose exec`, not against a
locally-installed Postgres client.

## Restoring a backup

```sh
make restore file=backups/microlearning-20260101T120000.sql
```

**This is destructive.** It drops and recreates the entire `public` schema before
loading the dump, so anything in the live database that isn't in that specific backup
file is gone afterward — there is no confirmation prompt built into the Makefile
target itself, so be certain of the `file=` path before running it.

If the backup predates a migration that's been applied since, run `make migrate`
afterward to bring the restored schema up to the current version.

## What this does and doesn't cover

- **Covers**: a full logical dump of the Postgres database — every table, every row,
  restorable into a fresh Postgres instance of a compatible version.
- **Doesn't cover**: Redis (nothing in it is durable data — it's a rate-limit/cache
  layer that's fine to lose and rebuild from scratch), uploaded files (there aren't
  any in this project), or anything outside the database.
- **Not automated** — there's no scheduled/cron backup job yet, and no off-host
  copy (e.g. to S3). Both are reasonable next steps once this project reaches a real
  deployment (Phase 8 — AWS), where losing the only copy of the database on one
  machine would actually matter. For local development, a manual `make backup`
  before a risky migration or experiment is the actual use case this solves today.

## Why plain `pg_dump` SQL, not a binary/custom-format dump

A plain SQL dump is human-inspectable (you can `less` it, `grep` it, hand-edit a
single bad row out of it before restoring) and restorable with nothing but `psql` —
no version-matched `pg_restore` binary required. The tradeoff is a larger file and a
slower restore on a very large database, which doesn't matter yet at this project's
size. Revisit this choice if the database ever gets large enough for that tradeoff to
flip.
