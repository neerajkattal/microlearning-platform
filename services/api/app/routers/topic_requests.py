from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..activity_log import log_activity
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/topic-requests", tags=["topic-requests"])


@router.post("", response_model=schemas.TopicRequestOut, status_code=201)
def request_topic(
    payload: schemas.TopicRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    normalized = payload.topic.strip().lower()

    existing = (
        db.query(models.TopicRequest)
        .filter_by(topic_normalized=normalized, status="pending")
        .first()
    )
    if existing is not None:
        existing.request_count += 1
        db.commit()
        db.refresh(existing)
        return existing

    request = models.TopicRequest(
        topic=payload.topic.strip(),
        topic_normalized=normalized,
        requested_by_user_id=current_user.id,
        requested_by_username=current_user.username,
    )
    db.add(request)
    log_activity(db, "topic_requested", user_id=current_user.id, username=current_user.username, detail=request.topic)
    db.commit()
    db.refresh(request)
    return request
