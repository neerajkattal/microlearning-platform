import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import create_admin_access_token, get_current_admin, hash_password, verify_password
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


# --- Bootstrap & login (unauthenticated by admin-token; bootstrap is
# gated by the shared ADMIN_API_KEY instead - see config.py) -----------


@router.post("/bootstrap", response_model=schemas.AdminTokenResponse, status_code=201)
def bootstrap_admin(
    payload: schemas.AdminBootstrapRequest,
    x_admin_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if x_admin_key is None or not hmac.compare_digest(x_admin_key, settings.admin_api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")

    if db.query(models.AdminUser).count() > 0:
        raise HTTPException(status_code=403, detail="An admin account already exists")

    admin = models.AdminUser(username=payload.username, password_hash=hash_password(payload.password))
    db.add(admin)
    db.commit()
    db.refresh(admin)

    token = create_admin_access_token(admin.id)
    return schemas.AdminTokenResponse(access_token=token, admin_username=admin.username)


@router.post("/login", response_model=schemas.AdminTokenResponse)
def admin_login(payload: schemas.AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter_by(username=payload.username).first()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_admin_access_token(admin.id)
    return schemas.AdminTokenResponse(access_token=token, admin_username=admin.username)


# Everything below requires a real admin login (Bearer token from
# /admin/login), not the bootstrap key.
_admin_only = Depends(get_current_admin)


# --- Overview / stats ---------------------------------------------------


@router.get("/stats", response_model=schemas.StatsOut, dependencies=[_admin_only])
def get_stats(db: Session = Depends(get_db)):
    per_category = (
        db.query(models.Category.name, func.count(models.Question.id))
        .outerjoin(models.Question, models.Question.category_id == models.Category.id)
        .group_by(models.Category.id)
        .order_by(models.Category.name)
        .all()
    )
    return schemas.StatsOut(
        total_users=db.query(func.count(models.User.id)).scalar(),
        total_questions=db.query(func.count(models.Question.id)).scalar(),
        total_categories=db.query(func.count(models.Category.id)).scalar(),
        total_quiz_sessions=db.query(func.count(models.QuizSession.id)).scalar(),
        questions_per_category=[{"category": name, "count": count} for name, count in per_category],
    )


@router.get("/activity", response_model=list[schemas.ActivityLogEntryOut], dependencies=[_admin_only])
def get_activity(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):
    return (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )


# --- Users ---------------------------------------------------------------


@router.get("/users", response_model=list[schemas.AdminUserDetailOut], dependencies=[_admin_only])
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


@router.post("/users/{user_id}/rename", response_model=schemas.AdminUserDetailOut, dependencies=[_admin_only])
def rename_user(user_id: int, payload: schemas.RenameUserRequest, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)

    existing = db.query(models.User).filter_by(username=payload.new_username).first()
    if existing is not None and existing.id != user.id:
        raise HTTPException(status_code=409, detail="Username is already taken")

    user.username = payload.new_username
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/hide", response_model=schemas.AdminUserDetailOut, dependencies=[_admin_only])
def hide_user_from_leaderboard(user_id: int, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    user.hidden_from_leaderboard = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/unhide", response_model=schemas.AdminUserDetailOut, dependencies=[_admin_only])
def unhide_user_from_leaderboard(user_id: int, db: Session = Depends(get_db)):
    user = _get_user_or_404(user_id, db)
    user.hidden_from_leaderboard = False
    db.commit()
    db.refresh(user)
    return user


# --- Categories ------------------------------------------------------------


@router.get("/categories", response_model=list[schemas.AdminCategoryOut], dependencies=[_admin_only])
def list_categories_admin(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Category, func.count(models.Question.id))
        .outerjoin(models.Question, models.Question.category_id == models.Category.id)
        .group_by(models.Category.id)
        .order_by(models.Category.name)
        .all()
    )
    return [
        schemas.AdminCategoryOut(
            id=c.id, name=c.name, slug=c.slug, is_active=c.is_active, question_count=count
        )
        for c, count in rows
    ]


@router.post("/categories", response_model=schemas.AdminCategoryOut, status_code=201, dependencies=[_admin_only])
def create_category(payload: schemas.CategoryCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(models.Category).filter_by(slug=payload.slug).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="A category with that slug already exists")

    category = models.Category(name=payload.name, slug=payload.slug)
    db.add(category)
    db.commit()
    db.refresh(category)
    return schemas.AdminCategoryOut(
        id=category.id, name=category.name, slug=category.slug, is_active=category.is_active, question_count=0
    )


@router.patch("/categories/{category_id}", response_model=schemas.AdminCategoryOut, dependencies=[_admin_only])
def update_category(category_id: int, payload: schemas.CategoryUpdateRequest, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.name is not None:
        category.name = payload.name
    if payload.is_active is not None:
        category.is_active = payload.is_active
    db.commit()
    db.refresh(category)

    count = db.query(func.count(models.Question.id)).filter_by(category_id=category.id).scalar()
    return schemas.AdminCategoryOut(
        id=category.id, name=category.name, slug=category.slug, is_active=category.is_active, question_count=count
    )


# --- Questions ---------------------------------------------------------


@router.get("/questions", response_model=list[schemas.AdminQuestionOut], dependencies=[_admin_only])
def list_questions_admin(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(models.Question).options(joinedload(models.Question.answers))
    if category_id is not None:
        query = query.filter(models.Question.category_id == category_id)
    if search:
        query = query.filter(models.Question.text.ilike(f"%{search}%"))
    return query.order_by(models.Question.id.desc()).offset(offset).limit(limit).all()


def _get_or_create_internal_source(db: Session) -> models.QuestionSource:
    source = db.query(models.QuestionSource).filter_by(name="internal").first()
    if source is None:
        source = models.QuestionSource(name="internal")
        db.add(source)
        db.flush()
    return source


@router.post("/questions", response_model=schemas.AdminQuestionOut, status_code=201, dependencies=[_admin_only])
def create_question(payload: schemas.QuestionCreateRequest, db: Session = Depends(get_db)):
    category = db.get(models.Category, payload.category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    source = _get_or_create_internal_source(db)
    question = models.Question(
        text=payload.text,
        category_id=payload.category_id,
        difficulty=payload.difficulty,
        explanation=payload.explanation,
        source_id=source.id,
    )
    db.add(question)
    db.flush()
    for answer in payload.answers:
        db.add(models.Answer(question_id=question.id, text=answer.text, is_correct=answer.is_correct))
    db.commit()
    db.refresh(question)
    return question


@router.patch("/questions/{question_id}", response_model=schemas.AdminQuestionOut, dependencies=[_admin_only])
def update_question(question_id: int, payload: schemas.QuestionUpdateRequest, db: Session = Depends(get_db)):
    question = db.get(models.Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.text is not None:
        question.text = payload.text
    if payload.difficulty is not None:
        question.difficulty = payload.difficulty
    if payload.explanation is not None:
        question.explanation = payload.explanation
    if payload.is_active is not None:
        question.is_active = payload.is_active
    db.commit()
    db.refresh(question)
    return question


# --- Game config -----------------------------------------------------------


def _get_or_create_game_config(db: Session) -> models.GameConfig:
    config = db.get(models.GameConfig, 1)
    if config is None:
        config = models.GameConfig(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("/game-config", response_model=schemas.GameConfigOut, dependencies=[_admin_only])
def get_game_config(db: Session = Depends(get_db)):
    return _get_or_create_game_config(db)


@router.patch("/game-config", response_model=schemas.GameConfigOut, dependencies=[_admin_only])
def update_game_config(payload: schemas.GameConfigUpdateRequest, db: Session = Depends(get_db)):
    config = _get_or_create_game_config(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config
