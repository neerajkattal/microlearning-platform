.PHONY: up down logs migrate makemigration test test-api test-worker test-web typecheck build

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

# Alembic runs from the host, not inside the api container: alembic.ini and
# migrations/ live at the repo root (per CLAUDE.md §6), while the api image
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
