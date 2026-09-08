from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.redis_client import get_redis

from .conftest import FakeRedis

client = TestClient(app)


def _override_get_db(session):
    def _get_db():
        yield session

    return _get_db


def test_allows_requests_up_to_the_limit(db_session):
    fake_redis = FakeRedis()
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    app.dependency_overrides[get_redis] = lambda: fake_redis
    try:
        for i in range(5):
            resp = client.post(
                "/auth/login", json={"username": f"nobody{i}", "password": "whatever1"}
            )
            assert resp.status_code == 401  # wrong creds, but not rate-limited yet
    finally:
        app.dependency_overrides.clear()


def test_blocks_the_request_once_the_limit_is_exceeded(db_session):
    fake_redis = FakeRedis()
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    app.dependency_overrides[get_redis] = lambda: fake_redis
    try:
        for _ in range(5):
            client.post("/auth/login", json={"username": "nobody", "password": "whatever1"})
        sixth = client.post("/auth/login", json={"username": "nobody", "password": "whatever1"})
    finally:
        app.dependency_overrides.clear()

    assert sixth.status_code == 429
    assert "Retry-After" in sixth.headers


def test_register_and_login_share_the_same_rate_limit_bucket(db_session):
    fake_redis = FakeRedis()
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    app.dependency_overrides[get_redis] = lambda: fake_redis
    try:
        for i in range(5):
            client.post("/auth/register", json={"username": f"user{i}", "password": "correct-horse"})
        blocked = client.post("/auth/login", json={"username": "user0", "password": "correct-horse"})
    finally:
        app.dependency_overrides.clear()

    assert blocked.status_code == 429


def test_rate_limit_keys_off_the_forwarded_client_ip_not_the_proxy(db_session):
    """Regression test for a real bug found during this phase's security
    review: without ProxyHeadersMiddleware trusting X-Forwarded-For,
    every request behind NGINX would key off NGINX's own container IP,
    bucketing every real user together under one shared limit. Two
    distinct forwarded IPs must get independent limits."""
    fake_redis = FakeRedis()
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    app.dependency_overrides[get_redis] = lambda: fake_redis
    try:
        for _ in range(5):
            client.post(
                "/auth/login",
                json={"username": "nobody", "password": "whatever1"},
                headers={"X-Forwarded-For": "10.0.0.1"},
            )
        still_first_ip = client.post(
            "/auth/login",
            json={"username": "nobody", "password": "whatever1"},
            headers={"X-Forwarded-For": "10.0.0.1"},
        )
        second_ip = client.post(
            "/auth/login",
            json={"username": "nobody", "password": "whatever1"},
            headers={"X-Forwarded-For": "10.0.0.2"},
        )
    finally:
        app.dependency_overrides.clear()

    assert still_first_ip.status_code == 429  # 10.0.0.1 is over its own limit
    assert second_ip.status_code == 401  # 10.0.0.2 has its own, untouched limit
    assert set(fake_redis.values.keys()) == {"ratelimit:auth:10.0.0.1", "ratelimit:auth:10.0.0.2"}
