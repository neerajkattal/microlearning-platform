# Render-specific image for the API. Separate from api.Dockerfile
# (used by local docker-compose) rather than changing that one, because
# migrations/env.py locates services/api via a path relative to itself
# (`migrations/../services/api`) — that only resolves if the image
# preserves the real repo layout (services/api/app as a subdirectory),
# which api.Dockerfile deliberately doesn't do (it flattens
# services/api/app to just /app/app for a smaller, simpler local image).
# Render needs to run `alembic upgrade head` against the real production
# database on every deploy (there's no host machine to run `make migrate`
# from, unlike local dev), so this image keeps the real layout instead.
FROM python:3.12-slim
WORKDIR /repo
COPY services/api/requirements.txt services/api/requirements.txt
RUN pip install --no-cache-dir -r services/api/requirements.txt
COPY services/api/app services/api/app
COPY alembic.ini alembic.ini
COPY migrations migrations
# Migrations run as part of the container's own startup, not via
# Render's "pre-deploy command" — that field turned out to not actually
# take effect when set through Render's API (accepted with a 200, never
# persisted or reflected back), so baking it into the image's own CMD is
# both simpler and platform-independent: this container is self-migrating
# wherever it runs, not dependent on a Render-specific mechanism.
# Render sets $PORT dynamically for web services; falls back to 10000
# (Render's own conventional default) if it's ever unset.
CMD ["sh", "-c", "cd /repo && alembic -c alembic.ini upgrade head && cd /repo/services/api && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
