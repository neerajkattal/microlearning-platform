.PHONY: up down logs migrate makemigration test test-api test-worker test-web typecheck build backup restore

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

# Alembic runs from the host, not inside the api container: alembic.ini and
# migrations/ live at the repo root (per ENGINEERING.md §6), while the api image
# only carries services/api/app. Requires `docker compose up` (or at least
# the postgres service) to already be running, using its host port mapping.
migrate:
	DATABASE_URL=postgresql://microlearning:microlearning@localhost:5432/microlearning \
		services/api/.venv/bin/alembic -c alembic.ini upgrade head

makemigration:
	DATABASE_URL=postgresql://microlearning:microlearning@localhost:5432/microlearning \
		services/api/.venv/bin/alembic -c alembic.ini revision --autogenerate -m "$(m)"

test: test-api test-worker test-web

test-api:
	cd services/api && .venv/bin/pytest

test-worker:
	cd services/worker && .venv/bin/pytest

test-web:
	npm run test -w @microlearning/web

typecheck:
	npm run typecheck -w @microlearning/shared-types
	npm run typecheck -w @microlearning/game-contracts

build:
	npm run build -w @microlearning/web

# See docs/operations/BACKUPS.md for the full runbook, including restore.
backup:
	mkdir -p backups
	docker compose exec -T postgres pg_dump -U microlearning -d microlearning \
		> backups/microlearning-$$(date +%Y%m%dT%H%M%S).sql
	@echo "Backup written to backups/"
	@ls -la backups/ | tail -1

# Usage: make restore file=backups/microlearning-20260101T000000.sql
# Destructive: drops and recreates the public schema before restoring, so
# anything not in the given backup file is gone afterward. Requires the
# stack to already be running (postgres reachable via docker compose).
restore:
	@test -n "$(file)" || (echo "Usage: make restore file=backups/<name>.sql" >&2 && exit 1)
	@test -f "$(file)" || (echo "No such file: $(file)" >&2 && exit 1)
	docker compose exec -T postgres psql -U microlearning -d microlearning \
		-c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	docker compose exec -T postgres psql -U microlearning -d microlearning < "$(file)"
	@echo "Restored from $(file). Run 'make migrate' if the backup predates a later migration."
