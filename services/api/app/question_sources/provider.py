from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


# The normalized shape every provider must produce, regardless of how
# wildly different the source API's own response looks.
@dataclass
class RawQuestion:
    """What a QuestionProvider hands back — normalized, but not yet
    persisted or deduplicated. The ingestion pipeline (Phase 1, see
    docs/BUILD_PLAN.md) turns these into Question/Answer rows."""

    source: str
    source_question_id: Optional[str]
    text: str
    category: str
    difficulty: str
    correct_answer: str
    incorrect_answers: list[str]
    license: Optional[str] = None


# Base class every question source (OpenTDB, QuizAPI.io, ...) implements,
# so the ingestion pipeline can treat them all identically.
class QuestionProvider(ABC):
    """Adapter boundary (ENGINEERING.md 'Question/content boundary'): games and
    the Quiz Engine never call a provider directly, only the ingestion
    pipeline does. OpenTDB is one implementation; internal/manually-authored
    questions and future providers are others.
    """

    # Fetches and normalizes one batch of questions from this source.
    @abstractmethod
    def fetch_batch(self, *, amount: int, category: Optional[str] = None) -> list[RawQuestion]:
        """Fetch up to `amount` questions. Implementations must not raise
        on a single malformed item within a batch — skip it and let the
        caller log it; ingestion must tolerate partially bad responses."""
        raise NotImplementedError
