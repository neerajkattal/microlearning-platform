from fastapi import Depends, HTTPException, Request
from redis import Redis

from .redis_client import get_redis


def rate_limit(key_prefix: str, *, limit: int, window_seconds: int):
    """FastAPI dependency factory: a fixed-window counter per client IP,
    stored in Redis — `INCR` the window's key, set it to expire on the
    first hit of that window, and reject once the count exceeds `limit`.
    Deliberately simple (a fixed window can allow a short burst right at
    the window boundary, unlike a sliding-window log) — good enough for
    "stop naive credential-stuffing," not a general-purpose API gateway
    feature."""

    def dependency(request: Request, redis: Redis = Depends(get_redis)) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{key_prefix}:{client_ip}"

        current = redis.incr(key)
        if current == 1:
            redis.expire(key, window_seconds)

        if current > limit:
            retry_after = redis.ttl(key)
            raise HTTPException(
                status_code=429,
                detail="Too many attempts. Please try again later.",
                headers={"Retry-After": str(max(retry_after, 1))},
            )

    return dependency
