from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=schemas.UserMeOut)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    achievements = [ua.achievement for ua in current_user.achievements]
    return schemas.UserMeOut(
        user=schemas.UserOut.model_validate(current_user),
        stats=schemas.UserStatsOut.model_validate(current_user.stats),
        achievements=[schemas.AchievementOut.model_validate(a) for a in achievements],
    )


@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntryOut])
def get_leaderboard(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.User, models.UserStats)
        .join(models.UserStats, models.UserStats.user_id == models.User.id)
        .order_by(models.UserStats.xp.desc())
        .limit(limit)
        .all()
    )
    return [
        schemas.LeaderboardEntryOut(username=user.username, xp=stats.xp, level=stats.level)
        for user, stats in rows
    ]
