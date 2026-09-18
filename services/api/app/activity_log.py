from typing import Optional

from sqlalchemy.orm import Session

from . import models


def log_activity(
    db: Session,
    event_type: str,
    *,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    detail: Optional[str] = None,
) -> None:
    """Fire-and-forget: appends to the feed the admin dashboard reads.
    Callers commit alongside their own transaction (this doesn't commit
    itself) so a log entry never persists for a request that itself
    rolled back."""
    db.add(models.ActivityLog(event_type=event_type, user_id=user_id, username=username, detail=detail))
