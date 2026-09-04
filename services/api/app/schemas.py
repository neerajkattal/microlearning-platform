from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class IngestionRequest(BaseModel):
    amount: int = Field(default=10, ge=1, le=50)


class IngestionResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fetched: int
    inserted: int
    skipped_duplicate: int
    skipped_malformed: int
    errors: list[str]


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    question_count: int


class QuestionSummaryOut(BaseModel):
    # Deliberately no answers/choices here — this is a Phase 1 content-pool
    # visibility endpoint, not the player-facing question fetch. That's
    # Phase 2's Quiz Engine, which owns session-scoped answer randomization
    # and must never leak `isCorrect` (see CLAUDE.md "Security boundary").
    id: int
    text: str
    difficulty: str
    category: str
    source: str
    created_at: datetime


class StartQuizSessionRequest(BaseModel):
    category: Optional[str] = None
    question_count: int = Field(default=5, ge=1, le=20)


class AnswerChoiceOut(BaseModel):
    # id + text only — never isCorrect (CLAUDE.md "Security boundary").
    id: int
    text: str


class SessionQuestionOut(BaseModel):
    session_question_id: int
    question_id: int
    prompt: str
    difficulty: str
    choices: list[AnswerChoiceOut]


class QuizSessionOut(BaseModel):
    id: int
    status: str
    questions: list[SessionQuestionOut]


class SubmitAnswerRequest(BaseModel):
    selected_answer_id: int
    response_time_ms: Optional[int] = Field(default=None, ge=0)


class SubmitAnswerResult(BaseModel):
    is_correct: bool
    correct_answer_id: int
    explanation: Optional[str]
    xp_earned: int


class CompleteSessionResult(BaseModel):
    session_id: int
    score: int
    total_questions: int
    xp_earned: int
    total_xp: int
    level: int
    streak: int
