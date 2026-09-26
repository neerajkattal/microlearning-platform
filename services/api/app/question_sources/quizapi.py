from typing import Optional

import httpx

from ..config import settings
from .provider import QuestionProvider, RawQuestion


class QuizApiProvider(QuestionProvider):
    """QuizAPI.io adapter - a second static question bank alongside
    OpenTDB, skewed toward tech/programming categories (DevOps, Docker,
    Programming) OpenTDB doesn't really cover.

    Unlike OpenTDB, QuizAPI.io questions carry a real, stable `id` -
    used directly as source_question_id, no content-hash workaround
    needed (see OpenTDBProvider._normalize).

    QuizAPI.io also serves TRUE_FALSE questions (2 answers) alongside
    MULTIPLE_CHOICE (4) - both games (Lane Rush's 4 lanes, Balloon
    Pop's 4 balloons) hardcode exactly 4 answer choices, so TRUE_FALSE
    items are filtered out here rather than reaching the ingestion
    pipeline and producing a Question no game mode can actually render.
    """

    # Builds the provider, defaulting to the configured QuizAPI.io URL/key
    # (a caller can inject its own client/key for testing).
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None, client: Optional[httpx.Client] = None):
        self.base_url = base_url or settings.quizapi_base_url
        self.api_key = api_key or settings.quizapi_key
        self._client = client or httpx.Client(timeout=10.0)

    # Calls QuizAPI.io for one batch of questions, keeps only the
    # multiple-choice ones, and normalizes each into a RawQuestion.
    def fetch_batch(self, *, amount: int, category: Optional[str] = None) -> list[RawQuestion]:
        params: dict[str, int | str] = {"limit": min(amount, 50)}
        if category:
            params["category"] = category
        response = self._client.get(
            self.base_url,
            params=params,
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        response.raise_for_status()
        payload = response.json()

        if not payload.get("success"):
            return []

        normalized = []
        for item in payload.get("data", []):
            if item.get("type") != "MULTIPLE_CHOICE":
                continue
            raw = self._normalize(item)
            if raw is not None:
                normalized.append(raw)
        return normalized

    # Converts one raw QuizAPI.io result into our RawQuestion shape, or
    # None if it's missing a clean single-correct-answer set.
    def _normalize(self, item: dict) -> Optional[RawQuestion]:
        answers = item.get("answers", [])
        correct = [a["text"] for a in answers if a.get("isCorrect")]
        incorrect = [a["text"] for a in answers if not a.get("isCorrect")]
        # Same "tolerate a malformed item within a batch" contract as
        # OpenTDBProvider - skip it here rather than let a single bad
        # item reach _ingest_one's stricter ValueError, which would
        # otherwise count as skipped_malformed instead of just absent.
        if len(correct) != 1 or not incorrect:
            return None

        return RawQuestion(
            source="quizapi",
            source_question_id=str(item["id"]),
            text=item["text"],
            category=item.get("category") or "Programming",
            difficulty=(item.get("difficulty") or "medium").lower(),
            correct_answer=correct[0],
            incorrect_answers=incorrect,
            license=None,
        )
