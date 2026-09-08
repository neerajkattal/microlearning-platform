from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..quiz_engine import sessions as quiz_sessions
from ..quiz_engine.sessions import (
    AnswerNotFoundError,
    NoQuestionsAvailableError,
    QuestionAlreadyAnsweredError,
    SessionNotFoundError,
    SessionNotInProgressError,
    SessionQuestionNotFoundError,
)

router = APIRouter(prefix="/quiz-sessions", tags=["quiz"])


@router.post("", response_model=schemas.QuizSessionOut, status_code=201)
def start_quiz_session(
    payload: schemas.StartQuizSessionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        session = quiz_sessions.start_session(
            db, user=current_user, category_slug=payload.category, question_count=payload.question_count
        )
    except NoQuestionsAvailableError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return _to_session_out(session)


@router.get("/{session_id}", response_model=schemas.QuizSessionOut)
def get_quiz_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        session = quiz_sessions.get_session(db, session_id, owner_id=current_user.id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return _to_session_out(session)


@router.post("/{session_id}/questions/{session_question_id}/answer", response_model=schemas.SubmitAnswerResult)
def submit_answer(
    session_id: int,
    session_question_id: int,
    payload: schemas.SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        attempt, xp_earned = quiz_sessions.submit_answer(
            db,
            session_id=session_id,
            session_question_id=session_question_id,
            selected_answer_id=payload.selected_answer_id,
            response_time_ms=payload.response_time_ms,
            owner_id=current_user.id,
        )
    except (SessionNotFoundError, SessionQuestionNotFoundError, AnswerNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except (SessionNotInProgressError, QuestionAlreadyAnsweredError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    question = attempt.quiz_session_question.question
    correct_answer = next(a for a in question.answers if a.is_correct)
    return schemas.SubmitAnswerResult(
        is_correct=attempt.is_correct,
        correct_answer_id=correct_answer.id,
        explanation=question.explanation,
        xp_earned=xp_earned,
    )


@router.post("/{session_id}/complete", response_model=schemas.CompleteSessionResult)
def complete_quiz_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        result = quiz_sessions.complete_session(db, session_id, owner_id=current_user.id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except SessionNotInProgressError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return schemas.CompleteSessionResult(**result)


def _to_session_out(session: models.QuizSession) -> schemas.QuizSessionOut:
    questions = []
    for sq in session.session_questions:
        answers_by_id = {a.id: a for a in sq.question.answers}
        choices = [
            schemas.AnswerChoiceOut(id=aid, text=answers_by_id[aid].text) for aid in sq.shown_answer_order
        ]
        questions.append(
            schemas.SessionQuestionOut(
                session_question_id=sq.id,
                question_id=sq.question_id,
                prompt=sq.question.text,
                difficulty=sq.question.difficulty,
                choices=choices,
            )
        )
    return schemas.QuizSessionOut(id=session.id, status=session.status, questions=questions)
