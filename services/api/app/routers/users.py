from fastapi import APIRouter, Depends, Query
from redis import Redis
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..cache import cached_json
from ..config import settings
from ..database import get_db
from ..redis_client import get_redis

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=schemas.UserMeOut)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    achievements = [ua.achievement for ua in current_user.achievements]
    return schemas.UserMeOut(
        user=schemas.UserOut.model_validate(current_user),
        stats=schemas.UserStatsOut.model_validate(current_user.stats),
        achievements=[schemas.AchievementOut.model_validate(a) for a in achievements],
    )


@router.patch("/users/me", response_model=schemas.UserOut)
def update_my_profile(
    payload: schemas.UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.avatar = payload.avatar
    db.commit()
    db.refresh(current_user)
    return schemas.UserOut.model_validate(current_user)


@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntryOut])
def get_leaderboard(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    def compute():
        rows = (
            db.query(models.User, models.UserStats)
            .join(models.UserStats, models.UserStats.user_id == models.User.id)
            .order_by(models.UserStats.xp.desc())
            .limit(limit)
            .all()
        )
        return [
            {"username": user.username, "avatar": user.avatar, "xp": stats.xp, "level": stats.level}
            for user, stats in rows
        ]

    # A much shorter TTL than /categories: the leaderboard genuinely
    # changes every time anyone completes a quiz, but it's still fine for
    # it to lag reality by a handful of seconds rather than recomputing
    # this join+sort on every single page view.
    data = cached_json(redis, f"cache:leaderboard:limit:{limit}", settings.leaderboard_cache_ttl_seconds, compute)
    return [schemas.LeaderboardEntryOut(**row) for row in data]
