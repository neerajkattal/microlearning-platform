from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

import redis

from .config import settings


def make_engine() -> Engine:
    return create_engine(settings.database_url)


def make_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, socket_connect_timeout=2)


def check_database(engine: Engine) -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def check_redis(client: redis.Redis) -> bool:
    try:
        return bool(client.ping())
    except Exception:
        return False
