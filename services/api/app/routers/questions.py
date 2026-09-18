from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from redis import Redis
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..cache import cached_json
from ..config import settings
from ..database import get_db
from ..redis_client import get_redis

router = APIRouter(tags=["questions"])


@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db), redis: Redis = Depends(get_redis)):
    def compute():
        rows = (
            db.query(models.Category, func.count(models.Question.id))
            .filter(models.Category.is_active.is_(True))
            .outerjoin(
                models.Question,
                (models.Question.category_id == models.Category.id) & (models.Question.is_active.is_(True)),
            )
            .group_by(models.Category.id)
            .order_by(models.Category.name)
            .all()
        )
        return [
            {"id": category.id, "name": category.name, "slug": category.slug, "question_count": count}
            for category, count in rows
        ]

    # The category list only changes when ingestion runs (a scheduled
    # worker job, not a per-request event — see ADR-0003), so a short
    # cache here trades a little staleness for skipping a join+group-by
    # query on what's likely this app's single most-read endpoint.
    data = cached_json(redis, "cache:categories", settings.categories_cache_ttl_seconds, compute)
    return [schemas.CategoryOut(**row) for row in data]


@router.get("/questions", response_model=list[schemas.QuestionSummaryOut])
def list_questions(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(models.Question).options(
        joinedload(models.Question.category), joinedload(models.Question.source)
    ).filter(models.Question.is_active.is_(True))
    if category:
        query = query.join(models.Category).filter(models.Category.slug == category)
    if difficulty:
        query = query.filter(models.Question.difficulty == difficulty)

    questions = query.order_by(models.Question.id).offset(offset).limit(limit).all()
    return [_to_summary(q) for q in questions]


@router.get("/questions/{question_id}", response_model=schemas.QuestionSummaryOut)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = (
        db.query(models.Question)
        .options(joinedload(models.Question.category), joinedload(models.Question.source))
        .filter(models.Question.id == question_id)
        .first()
    )
    if question is None:
        raise HTTPException(status_code=404, detail="question not found")
    return _to_summary(question)


def _to_summary(question: models.Question) -> schemas.QuestionSummaryOut:
    return schemas.QuestionSummaryOut(
        id=question.id,
        text=question.text,
        difficulty=question.difficulty,
        category=question.category.name,
        source=question.source.name,
        created_at=question.created_at,
    )
