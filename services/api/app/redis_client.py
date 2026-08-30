import redis

from .config import settings

redis_client = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=2)


def get_redis() -> redis.Redis:
    return redis_client
