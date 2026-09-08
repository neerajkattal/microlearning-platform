import json
from typing import Callable, TypeVar

from redis import Redis

T = TypeVar("T")


def cached_json(redis: Redis, key: str, ttl_seconds: int, compute: Callable[[], T]) -> T:
    """Cache-aside: return the cached value for `key` if present, otherwise
    call `compute()`, cache its (JSON-serializable) result for `ttl_seconds`,
    and return it. `compute()` must return plain JSON-serializable data
    (dicts/lists/primitives) — not ORM objects or Pydantic models — since
    it has to round-trip through `json.dumps`/`json.loads` either way,
    whether this call actually hits Redis or not.

    Deliberately no cache invalidation on write (e.g. a new leaderboard
    entry doesn't proactively clear this key) — every cached value here
    has a short TTL and staleness up to that TTL is an accepted tradeoff,
    not a bug. A short TTL was chosen specifically so this doesn't need
    invalidation logic at all.
    """
    cached = redis.get(key)
    if cached is not None:
        return json.loads(cached)

    result = compute()
    redis.setex(key, ttl_seconds, json.dumps(result))
    return result
