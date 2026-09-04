from datetime import datetime

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
