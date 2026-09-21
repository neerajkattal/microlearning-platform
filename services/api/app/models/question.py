from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from ..database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    # Deactivated categories are hidden from players (GET /categories) and
    # excluded from new quiz sessions, but never deleted - past sessions
    # still reference their questions.
    is_active = Column(Boolean, nullable=False, default=True)

    questions = relationship("Question", back_populates="category")


class QuestionSource(Base):
    __tablename__ = "question_sources"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # e.g. "opentdb", "internal"
    base_url = Column(String, nullable=True)

    questions = relationship("Question", back_populates="source")


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        UniqueConstraint("source_id", "source_question_id", name="uq_source_question"),
    )

    id = Column(Integer, primary_key=True)
    text = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    difficulty = Column(String, nullable=False)  # "easy" | "medium" | "hard"
    explanation = Column(String, nullable=True)
    source_id = Column(Integer, ForeignKey("question_sources.id"), nullable=False)
    # Nullable: internally-authored questions have no external source id.
    source_question_id = Column(String, nullable=True)
    license = Column(String, nullable=True)
    # A deactivated question is skipped by new sessions but never deleted -
    # a past quiz_session_question / answer_attempt still needs it to exist.
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    category = relationship("Category", back_populates="questions")
    source = relationship("QuestionSource", back_populates="questions")
    answers = relationship("Answer", back_populates="question")
    statistics = relationship("QuestionStatistics", back_populates="question", uselist=False)


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    text = Column(String, nullable=False)
    # Server-only. Must never be serialized into a response the browser can read
    # before the quiz engine has validated the player's attempt (see ENGINEERING.md
    # "Security boundary").
    is_correct = Column(Boolean, nullable=False, default=False)

    question = relationship("Question", back_populates="answers")
