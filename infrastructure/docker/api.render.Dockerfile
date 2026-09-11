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
WORKDIR /repo/services/api
# Render sets $PORT dynamically for web services; falls back to 10000
# (Render's own conventional default) if it's ever unset.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
