import random
from datetime import UTC, date, datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from .scoring import apply_daily_activity, calculate_level, calculate_xp

# No auth system yet (see docs/architecture/PHASE_0.md) — every request
# acts as this single seeded user, same pattern as ingestion's lack of
# auth. Revisit once a real auth phase exists.
TEST_USERNAME = "test_user"


class QuizEngineError(Exception):
    """Base for quiz-engine errors; the router translates these to HTTP."""


class NoQuestionsAvailableError(QuizEngineError):
    pass


class SessionNotFoundError(QuizEngineError):
    pass


class SessionNotInProgressError(QuizEngineError):
    pass


class QuestionAlreadyAnsweredError(QuizEngineError):
    pass


class SessionQuestionNotFoundError(QuizEngineError):
    pass


class AnswerNotFoundError(QuizEngineError):
    pass


def get_or_create_test_user(db: Session) -> models.User:
    user = db.query(models.User).filter_by(username=TEST_USERNAME).first()
    if user:
        return user
    user = models.User(username=TEST_USERNAME)
    db.add(user)
    db.flush()
    db.add(models.UserStats(user_id=user.id))
    db.flush()
    return user


def start_session(db: Session, *, category_slug: Optional[str], question_count: int) -> models.QuizSession:
    user = get_or_create_test_user(db)

    query = db.query(models.Question)
    category = None
    if category_slug:
        category = db.query(models.Category).filter_by(slug=category_slug).first()
        if category is None:
            raise NoQuestionsAvailableError(f"unknown category: {category_slug}")
        query = query.filter(models.Question.category_id == category.id)

    # Random selection, not spaced-repetition/no-repeat — Phase 2 proves
    # the session/scoring mechanic; smarter selection is a later concern.
    # Silently returns fewer than `question_count` if the pool is smaller;
    # only errors when the pool is empty.
    questions = query.order_by(func.random()).limit(question_count).all()
    if not questions:
        raise NoQuestionsAvailableError("no questions available for the requested category")

    session = models.QuizSession(
        user_id=user.id,
        category_id=category.id if category else None,
        status="in_progress",
    )
    db.add(session)
    db.flush()

    for order, question in enumerate(questions):
        answer_ids = [a.id for a in question.answers]
        random.shuffle(answer_ids)
        db.add(
            models.QuizSessionQuestion(
                quiz_session_id=session.id,
                question_id=question.id,
                order=order,
                shown_answer_order=answer_ids,
            )
        )

    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: int) -> models.QuizSession:
    session = db.get(models.QuizSession, session_id)
    if session is None:
        raise SessionNotFoundError(f"quiz session {session_id} not found")
    return session


def _get_in_progress_session_question(
    db: Session, session_id: int, session_question_id: int
) -> tuple[models.QuizSession, models.QuizSessionQuestion]:
    session = get_session(db, session_id)
    if session.status != "in_progress":
        raise SessionNotInProgressError(f"quiz session {session_id} is {session.status}")

    sq = db.get(models.QuizSessionQuestion, session_question_id)
    if sq is None or sq.quiz_session_id != session_id:
        raise SessionQuestionNotFoundError(f"question {session_question_id} not found in session {session_id}")
    return session, sq


def submit_answer(
    db: Session,
    *,
    session_id: int,
    session_question_id: int,
    selected_answer_id: int,
    response_time_ms: Optional[int],
) -> tuple[models.AnswerAttempt, int]:
    session, sq = _get_in_progress_session_question(db, session_id, session_question_id)

    existing = db.query(models.AnswerAttempt).filter_by(quiz_session_question_id=sq.id).first()
    if existing:
        raise QuestionAlreadyAnsweredError(f"question {session_question_id} was already answered")

    answer = db.get(models.Answer, selected_answer_id)
    if answer is None or answer.question_id != sq.question_id:
        raise AnswerNotFoundError(f"answer {selected_answer_id} is not a choice for this question")

    stats = session.user.stats
    xp_earned = calculate_xp(
        is_correct=answer.is_correct,
        difficulty=sq.question.difficulty,
        response_time_ms=response_time_ms,
        current_streak=stats.current_streak,
    )

    attempt = models.AnswerAttempt(
        quiz_session_question_id=sq.id,
        selected_answer_id=selected_answer_id,
        is_correct=answer.is_correct,
        response_time_ms=response_time_ms,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return attempt, xp_earned


def complete_session(db: Session, session_id: int) -> dict:
    session = get_session(db, session_id)
    if session.status != "in_progress":
        raise SessionNotInProgressError(f"quiz session {session_id} is {session.status}")

    stats = session.user.stats

    total_xp_earned = 0
    score = 0
    for sq in session.session_questions:
        attempt = sq.attempt
        if attempt is None:
            continue  # unanswered — no credit, matches server-authoritative scoring
        if attempt.is_correct:
            score += 1
        total_xp_earned += calculate_xp(
            is_correct=attempt.is_correct,
            difficulty=sq.question.difficulty,
            response_time_ms=attempt.response_time_ms,
            current_streak=stats.current_streak,
        )

    stats.xp += total_xp_earned
    stats.level = calculate_level(stats.xp)
    apply_daily_activity(stats, date.today())

    session.status = "completed"
    session.completed_at = datetime.now(UTC)
    session.score = score

    db.commit()

    return {
        "session_id": session.id,
        "score": score,
        "total_questions": len(session.session_questions),
        "xp_earned": total_xp_earned,
        "total_xp": stats.xp,
        "level": stats.level,
        "streak": stats.current_streak,
    }
