from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["questions"])


@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Category, func.count(models.Question.id))
        .outerjoin(models.Question)
        .group_by(models.Category.id)
        .order_by(models.Category.name)
        .all()
    )
    return [
        schemas.CategoryOut(id=category.id, name=category.name, slug=category.slug, question_count=count)
        for category, count in rows
    ]


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
    )
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
