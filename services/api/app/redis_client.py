import redis

from .config import settings

# One shared Redis connection (pool), built once at import time.
redis_client = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=2)


# FastAPI dependency that hands routes the shared Redis client.
def get_redis() -> redis.Redis:
    return redis_client
