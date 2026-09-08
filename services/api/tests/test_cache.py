from app.cache import cached_json

from .conftest import FakeRedis


def test_computes_and_caches_on_a_miss():
    redis = FakeRedis()
    calls = []

    def compute():
        calls.append(1)
        return {"value": 42}

    result = cached_json(redis, "some-key", 60, compute)
    assert result == {"value": 42}
    assert len(calls) == 1


def test_returns_the_cached_value_without_recomputing_on_a_hit():
    redis = FakeRedis()
    calls = []

    def compute():
        calls.append(1)
        return {"value": len(calls)}

    first = cached_json(redis, "some-key", 60, compute)
    second = cached_json(redis, "some-key", 60, compute)

    assert first == second == {"value": 1}
    assert len(calls) == 1  # compute only ran once


def test_different_keys_are_cached_independently():
    redis = FakeRedis()
    a = cached_json(redis, "key-a", 60, lambda: "a-value")
    b = cached_json(redis, "key-b", 60, lambda: "b-value")
    assert a == "a-value"
    assert b == "b-value"
