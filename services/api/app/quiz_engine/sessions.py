import random
from datetime import UTC, date, datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..achievements import check_and_award_achievements
from ..activity_log import log_activity
from .scoring import apply_daily_activity, calculate_level, calculate_xp, get_active_scoring_config


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


def start_session(
    db: Session,
    *,
    user: models.User,
    category_slug: Optional[str],
    question_count: int,
    difficulty: Optional[str] = None,
) -> models.QuizSession:
    query = db.query(models.Question).filter(models.Question.is_active.is_(True))
    category = None
    if category_slug:
        category = db.query(models.Category).filter_by(slug=category_slug).first()
        if category is None or not category.is_active:
            raise NoQuestionsAvailableError(f"unknown category: {category_slug}")
        query = query.filter(models.Question.category_id == category.id)
    if difficulty:
        query = query.filter(models.Question.difficulty == difficulty)

    # Random selection, not spaced-repetition/no-repeat — Phase 2 proves
    # the session/scoring mechanic; smarter selection is a later concern.
    # Silently returns fewer than `question_count` if the pool is smaller;
    # only errors when the pool is empty.
    questions = query.order_by(func.random()).limit(question_count).all()
    if not questions:
        raise NoQuestionsAvailableError("no questions available for the requested category/difficulty")

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


def get_session(db: Session, session_id: int, *, owner_id: int) -> models.QuizSession:
    """`owner_id` mismatch raises the same error as a genuinely missing
    session — a 404, not a 403 — so a session id belonging to another user
    can't be distinguished from one that doesn't exist at all."""
    session = db.get(models.QuizSession, session_id)
    if session is None or session.user_id != owner_id:
        raise SessionNotFoundError(f"quiz session {session_id} not found")
    return session


def _get_in_progress_session_question(
    db: Session, session_id: int, session_question_id: int, *, owner_id: int
) -> tuple[models.QuizSession, models.QuizSessionQuestion]:
    session = get_session(db, session_id, owner_id=owner_id)
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
    owner_id: int,
) -> tuple[models.AnswerAttempt, int]:
    session, sq = _get_in_progress_session_question(db, session_id, session_question_id, owner_id=owner_id)

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
        config=get_active_scoring_config(db),
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


def get_hint(db: Session, *, session_id: int, session_question_id: int, owner_id: int) -> list[int]:
    """Returns 2 answer ids safe to rule out — always wrong, never the
    correct one. Deterministic per session-question (seeded off its own
    id) rather than re-randomized on every call: with only 3 wrong
    answers to begin with, a second call picking a *different* random
    pair would expose the identity of the one wrong answer left out the
    first time, defeating the whole point via repeated calls."""
    _, sq = _get_in_progress_session_question(db, session_id, session_question_id, owner_id=owner_id)

    wrong_answer_ids = [a.id for a in sq.question.answers if not a.is_correct]
    return sorted(random.Random(sq.id).sample(wrong_answer_ids, min(2, len(wrong_answer_ids))))


def complete_session(db: Session, session_id: int, *, owner_id: int) -> dict:
    session = get_session(db, session_id, owner_id=owner_id)
    if session.status != "in_progress":
        raise SessionNotInProgressError(f"quiz session {session_id} is {session.status}")

    stats = session.user.stats
    config = get_active_scoring_config(db)

    total_xp_earned = 0
    score = 0
    review = []
    for sq in session.session_questions:
        attempt = sq.attempt
        correct_answer = next(a for a in sq.question.answers if a.is_correct)

        if attempt is None:
            # unanswered — no credit, matches server-authoritative scoring
            review.append(
                {
                    "question_id": sq.question_id,
                    "prompt": sq.question.text,
                    "your_answer": None,
                    "correct_answer": correct_answer.text,
                    "is_correct": False,
                }
            )
            continue

        if attempt.is_correct:
            score += 1
        total_xp_earned += calculate_xp(
            is_correct=attempt.is_correct,
            difficulty=sq.question.difficulty,
            response_time_ms=attempt.response_time_ms,
            current_streak=stats.current_streak,
            config=config,
        )
        review.append(
            {
                "question_id": sq.question_id,
                "prompt": sq.question.text,
                "your_answer": attempt.selected_answer.text if attempt.selected_answer else None,
                "correct_answer": correct_answer.text,
                "is_correct": attempt.is_correct,
            }
        )

    stats.xp += total_xp_earned
    stats.level = calculate_level(stats.xp, config)
    apply_daily_activity(stats, date.today())

    session.status = "completed"
    session.completed_at = datetime.now(UTC)
    session.score = score

    newly_earned = check_and_award_achievements(
        db, user=session.user, score=score, total_questions=len(session.session_questions), stats=stats
    )

    log_activity(
        db,
        "quiz_completed",
        user_id=session.user.id,
        username=session.user.username,
        detail=f"score {score}/{len(session.session_questions)}, +{total_xp_earned} XP",
    )

    db.commit()

    return {
        "session_id": session.id,
        "score": score,
        "total_questions": len(session.session_questions),
        "xp_earned": total_xp_earned,
        "total_xp": stats.xp,
        "level": stats.level,
        "streak": stats.current_streak,
        "achievements_earned": newly_earned,
        "review": review,
    }
