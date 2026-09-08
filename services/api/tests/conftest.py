import time

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.main import app
from app.redis_client import get_redis

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def _fresh_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


class FakeRedis:
    """An in-memory stand-in supporting the handful of Redis commands this
    project actually uses (incr/expire/ttl for rate limiting, get/setex for
    caching, ping for the readiness check) — enough to exercise real
    call sites in tests without a real Redis server. Real Redis itself is
    exercised live via docker compose, not in this fast unit-test suite."""

    def __init__(self):
        self.values: dict[str, str] = {}
        self.expires_at: dict[str, float] = {}

    def _expired(self, key: str) -> bool:
        expiry = self.expires_at.get(key)
        return expiry is not None and time.monotonic() >= expiry

    def incr(self, key: str) -> int:
        if self._expired(key):
            self.values.pop(key, None)
            self.expires_at.pop(key, None)
        current = int(self.values.get(key, 0)) + 1
        self.values[key] = str(current)
        return current

    def expire(self, key: str, seconds: int) -> None:
        self.expires_at[key] = time.monotonic() + seconds

    def ttl(self, key: str) -> int:
        expiry = self.expires_at.get(key)
        if expiry is None:
            return -1
        return max(0, round(expiry - time.monotonic()))

    def get(self, key: str):
        if self._expired(key):
            self.values.pop(key, None)
            self.expires_at.pop(key, None)
            return None
        value = self.values.get(key)
        return value.encode("utf-8") if value is not None else None

    def setex(self, key: str, seconds: int, value: str) -> None:
        self.values[key] = value
        self.expires_at[key] = time.monotonic() + seconds

    def delete(self, key: str) -> None:
        self.values.pop(key, None)
        self.expires_at.pop(key, None)

    def ping(self) -> bool:
        return True


@pytest.fixture(autouse=True)
def _default_fake_redis():
    """Every test gets a working fake Redis by default, since routes like
    /auth/register touch it (rate limiting) regardless of whether a given
    test is actually testing Redis behavior. Tests that care about the
    specific behavior (test_rate_limit.py, cache tests) install their own
    FakeRedis instance instead — this just prevents every other test from
    needing to know Redis is involved at all."""
    app.dependency_overrides[get_redis] = lambda: FakeRedis()
    yield
    app.dependency_overrides.pop(get_redis, None)
