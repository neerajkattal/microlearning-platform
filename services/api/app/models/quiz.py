from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import relationship

from ..database import Base


# One "run" of a quiz — a set of questions a specific user is answering,
# tracked from in_progress through completed (or abandoned).
class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    status = Column(String, default="in_progress", nullable=False)  # in_progress | completed | abandoned
    started_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    score = Column(Integer, nullable=True)

    user = relationship("User", back_populates="quiz_sessions")
    session_questions = relationship(
        "QuizSessionQuestion", back_populates="quiz_session", order_by="QuizSessionQuestion.order"
    )


# Join row: one question as it appears within one session, at a fixed
# position (`order`) and with its answer-choice order shuffled for that
# player's viewing.
class QuizSessionQuestion(Base):
    __tablename__ = "quiz_session_questions"

    id = Column(Integer, primary_key=True)
    quiz_session_id = Column(Integer, ForeignKey("quiz_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    order = Column(Integer, nullable=False)
    # Answer ids in the order they were shown to this player for this
    # question — presentation order is per-session, not part of the
    # permanent content model (see docs/architecture/QUESTION_SYSTEM.md).
    shown_answer_order = Column(JSON, nullable=False)

    quiz_session = relationship("QuizSession", back_populates="session_questions")
    question = relationship("Question")
    attempt = relationship("AnswerAttempt", back_populates="quiz_session_question", uselist=False)


# A player's actual answer to one session question — what they picked
# (if anything), whether it was right, and how fast they answered. This is
# the row calculate_xp (quiz_engine/scoring.py) is ultimately scoring.
class AnswerAttempt(Base):
    __tablename__ = "answer_attempts"

    id = Column(Integer, primary_key=True)
    quiz_session_question_id = Column(
        Integer, ForeignKey("quiz_session_questions.id"), unique=True, nullable=False
    )
    selected_answer_id = Column(Integer, ForeignKey("answers.id"), nullable=True)
    is_correct = Column(Boolean, nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    attempted_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)

    quiz_session_question = relationship("QuizSessionQuestion", back_populates="attempt")
    selected_answer = relationship("Answer")
