from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import require_admin
from ..database import get_db

# Every route here requires the X-Admin-Key header (see auth.require_admin) -
# set once on the whole router rather than per-route, so a new endpoint
# added later can't accidentally ship unprotected.
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[schemas.AdminUserOut])
def list_users(
    search: Optional[str] = Query(default=None, description="Case-insensitive substring match on username"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    if search:
        query = query.filter(models.User.username.ilike(f"%{search}%"))
    return query.order_by(models.User.created_at.desc()).limit(limit).all()


def _get_user_or_404(user_id: int, db: Session) -> models.User:
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/users/{user_id}/rename", response_model=schemas.AdminUserOut)
def rename_user(user_id: int, payload: schemas.RenameUserRequest, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)

    existing = db.query(models.User).filter_by(username=payload.new_username).first()
    if existing is not None and existing.id != user.id:
        raise HTTPException(status_code=409, detail="Username is already taken")

    user.username = payload.new_username
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/hide", response_model=schemas.AdminUserOut)
def hide_user_from_leaderboard(user_id: int, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    user.hidden_from_leaderboard = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/unhide", response_model=schemas.AdminUserOut)
def unhide_user_from_leaderboard(user_id: int, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    user.hidden_from_leaderboard = False
    db.commit()
    db.refresh(user)
    return user
