from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from redis import Redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..redis_client import get_redis

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Liveness only — the process is up. Does not touch dependencies."""
    return {"status": "ok"}


@router.get("/ready")
def ready(db: Session = Depends(get_db), redis: Redis = Depends(get_redis)):
    """Readiness — checks that Postgres and Redis are actually reachable."""
    checks = {"database": False, "redis": False}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        pass

    try:
        redis.ping()
        checks["redis"] = True
    except Exception:
        pass

    status_code = 200 if all(checks.values()) else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "ok" if status_code == 200 else "degraded", "checks": checks},
    )
