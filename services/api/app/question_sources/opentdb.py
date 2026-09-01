import html
from typing import Optional

import httpx

from ..config import settings
from .provider import QuestionProvider, RawQuestion


class OpenTDBProvider(QuestionProvider):
    """Skeleton adapter proving the QuestionProvider abstraction holds for
    a real external source. Fetches one batch and normalizes OpenTDB's
    response shape into RawQuestion.

    Deliberately NOT implemented yet (Phase 1, see docs/BUILD_PLAN.md):
    retries, rate-limit backoff, pagination across multiple batches,
    deduplication, and persistence. This class only proves fetch+normalize.
    """

    def __init__(self, base_url: Optional[str] = None, client: Optional[httpx.Client] = None):
        self.base_url = base_url or settings.opentdb_base_url
        self._client = client or httpx.Client(timeout=10.0)

    def fetch_batch(self, *, amount: int, category: Optional[str] = None) -> list[RawQuestion]:
        response = self._client.get(self.base_url, params={"amount": amount, "type": "multiple"})
        response.raise_for_status()
        payload = response.json()

        if payload.get("response_code") != 0:
            return []

        return [self._normalize(item) for item in payload.get("results", [])]

    def _normalize(self, item: dict) -> RawQuestion:
        return RawQuestion(
            source="opentdb",
            # OpenTDB has no stable per-question id; Phase 1's ingestion
            # job hashes the normalized question text instead for dedup.
            source_question_id=None,
            text=html.unescape(item["question"]),
            category=html.unescape(item["category"]),
            difficulty=item["difficulty"],
            correct_answer=html.unescape(item["correct_answer"]),
            incorrect_answers=[html.unescape(a) for a in item["incorrect_answers"]],
            license=None,
        )
