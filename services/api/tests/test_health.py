from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.redis_client import get_redis

client = TestClient(app)


def test_health_is_always_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ready_reports_degraded_when_dependencies_are_unreachable():
    broken_db = MagicMock()
    broken_db.execute.side_effect = ConnectionError("db down")
    broken_redis = MagicMock()
    broken_redis.ping.side_effect = ConnectionError("redis down")

    def override_db():
        yield broken_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_redis] = lambda: broken_redis
    try:
        resp = client.get("/ready")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["checks"] == {"database": False, "redis": False}


def test_ready_reports_ok_when_dependencies_are_reachable():
    fake_db = MagicMock()
    fake_redis = MagicMock()
    fake_redis.ping.return_value = True

    def override_db():
        yield fake_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_redis] = lambda: fake_redis
    try:
        resp = client.get("/ready")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "checks": {"database": True, "redis": True}}
