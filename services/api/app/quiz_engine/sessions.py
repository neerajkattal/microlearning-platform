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


# Raised when no questions match the requested category/difficulty.
class NoQuestionsAvailableError(QuizEngineError):
    pass


# Raised when a session id doesn't exist, or belongs to a different user.
class SessionNotFoundError(QuizEngineError):
    pass


# Raised when an action requires an in-progress session, but it's already
# completed or abandoned.
class SessionNotInProgressError(QuizEngineError):
    pass


# Raised when trying to answer a session-question that already has an attempt.
class QuestionAlreadyAnsweredError(QuizEngineError):
    pass


# Raised when a session-question id doesn't belong to the given session.
class SessionQuestionNotFoundError(QuizEngineError):
    pass


# Raised when the selected answer id isn't actually a choice for the question.
class AnswerNotFoundError(QuizEngineError):
    pass


# Creates a new quiz session: picks `question_count` random active
# questions matching the category/difficulty filters, shuffles each
# question's answer order, and persists it all as an in-progress session.
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


# Fetches a session by id, scoped to its owner so one player can never
# read or act on another player's session.
def get_session(db: Session, session_id: int, *, owner_id: int) -> models.QuizSession:
    """`owner_id` mismatch raises the same error as a genuinely missing
    session — a 404, not a 403 — so a session id belonging to another user
    can't be distinguished from one that doesn't exist at all."""
    session = db.get(models.QuizSession, session_id)
    if session is None or session.user_id != owner_id:
        raise SessionNotFoundError(f"quiz session {session_id} not found")
    return session


# Shared lookup used by submit_answer and get_hint: resolves a session +
# session-question pair, checking ownership and that the session is still
# in progress.
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


# Records a player's answer to one question, scores it server-side (the
# client never knows which choice is correct before this call), and
# returns the saved attempt plus the XP it earned.
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


# Picks 2 answer ids that are safe to eliminate for a question (always
# wrong, never the one correct answer), for the in-game hint feature.
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


# Finalizes a session: recomputes total XP/score from the stored answer
# attempts (authoritative, not trusting any client-reported running
# total), updates the player's stats/level/streak, awards any newly
# earned achievements, logs the completion, and returns a full summary
# with a per-question review.
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
