from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import create_access_token, hash_password, verify_password
from ..avatars import DEFAULT_AVATAR
from ..config import settings
from ..database import get_db
from ..rate_limit import rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])

_auth_rate_limit = rate_limit(
    "auth", limit=settings.auth_rate_limit_max, window_seconds=settings.auth_rate_limit_window_seconds
)


@router.post(
    "/register",
    response_model=schemas.TokenResponse,
    status_code=201,
    dependencies=[Depends(_auth_rate_limit)],
)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter_by(username=payload.username).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Username is already taken")

    user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        avatar=payload.avatar or DEFAULT_AVATAR,
    )
    db.add(user)
    db.flush()
    db.add(models.UserStats(user_id=user.id))
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.TokenResponse, dependencies=[Depends(_auth_rate_limit)])
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(username=payload.username).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))
