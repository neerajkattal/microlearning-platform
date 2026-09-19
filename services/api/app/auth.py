import hmac
from datetime import UTC, datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .config import settings
from .database import get_db

_bearer_scheme = HTTPBearer()


def require_operator_key(x_admin_key: Optional[str] = Header(default=None)) -> None:
    """The same shared secret that gates /admin/bootstrap, reused here
    for machine-to-machine calls (the GitHub Actions ingestion workflow,
    the worker's own scheduled job in local dev) that have no human to
    log in as - a JWT login flow doesn't fit a cron job the way it fits
    an admin opening the dashboard. Constant-time compare, same
    reasoning as require_admin used to have before it became a full
    login system."""
    if x_admin_key is None or not hmac.compare_digest(x_admin_key, settings.admin_api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[int]:
    """Returns the user id encoded in a valid, unexpired token, or None for
    anything invalid/expired/malformed — callers turn None into a 401."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError:
        return None
    try:
        return int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


def create_admin_access_token(admin_id: int) -> str:
    """Same JWT machinery as player tokens, but with `type: admin` in the
    payload - the two are otherwise indistinguishable (same secret, same
    algorithm), and this claim is what stops a player's own token from
    being replayed against /admin/* (and vice versa)."""
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.admin_jwt_expires_minutes)
    payload = {"sub": str(admin_id), "type": "admin", "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> models.AdminUser:
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")

    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")

    try:
        admin_id = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")

    admin = db.get(models.AdminUser, admin_id)
    if admin is None:
        raise HTTPException(status_code=401, detail="Admin account no longer exists")
    return admin
