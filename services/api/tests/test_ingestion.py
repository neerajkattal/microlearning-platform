from unittest.mock import patch

import httpx

from app import models
from app.ingestion import get_or_create_category, get_or_create_source, run_ingestion
from app.question_sources.provider import QuestionProvider, RawQuestion


def _raw(text="What is 2+2?", category="Math", difficulty="easy", correct="4", incorrect=None):
    return RawQuestion(
        source="opentdb",
        source_question_id=None,
        text=text,
        category=category,
        difficulty=difficulty,
        correct_answer=correct,
        incorrect_answers=incorrect or ["3", "5", "22"],
        license=None,
    )


class FakeProvider(QuestionProvider):
    def __init__(self, batches=None, error_then_batch=None):
        self._batches = list(batches or [])
        self._error_then_batch = error_then_batch
        self.calls = 0

    def fetch_batch(self, *, amount, category=None):
        self.calls += 1
        if self._error_then_batch is not None and self.calls <= self._error_then_batch[0]:
            raise httpx.RequestError("simulated network error")
        if self._batches:
            return self._batches.pop(0)
        return self._error_then_batch[1] if self._error_then_batch else []


def test_get_or_create_category_is_idempotent(db_session):
    first = get_or_create_category(db_session, "Science & Nature")
    second = get_or_create_category(db_session, "Science & Nature")
    assert first.id == second.id
    assert first.slug == "science-nature"


def test_get_or_create_source_is_idempotent(db_session):
    first = get_or_create_source(db_session, "opentdb", base_url="https://opentdb.com/api.php")
    second = get_or_create_source(db_session, "opentdb")
    assert first.id == second.id


def test_run_ingestion_inserts_new_questions(db_session):
    provider = FakeProvider(batches=[[_raw(), _raw(text="Capital of France?", correct="Paris", incorrect=["Lyon", "Nice", "Metz"])]])

    result = run_ingestion(db_session, provider, amount=2)

    assert result.fetched == 2
    assert result.inserted == 2
    assert result.skipped_duplicate == 0
    assert db_session.query(models.Question).count() == 2
    assert db_session.query(models.Answer).count() == 8  # 4 answers per question


def test_run_ingestion_is_idempotent_on_rerun(db_session):
    provider = FakeProvider(batches=[[_raw()], [_raw()]])

    first = run_ingestion(db_session, provider, amount=1)
    second = run_ingestion(db_session, provider, amount=1)

    assert first.inserted == 1
    assert second.inserted == 0
    assert second.skipped_duplicate == 1
    assert db_session.query(models.Question).count() == 1


def test_run_ingestion_skips_malformed_items_without_aborting_batch(db_session):
    malformed = _raw(text="")  # empty text -> malformed
    provider = FakeProvider(batches=[[malformed, _raw(text="A valid question?")]])

    result = run_ingestion(db_session, provider, amount=2)

    assert result.skipped_malformed == 1
    assert result.inserted == 1
    assert len(result.errors) == 1


def test_run_ingestion_retries_then_succeeds(db_session):
    provider = FakeProvider(error_then_batch=(2, [_raw()]))

    with patch("app.ingestion.time.sleep"):
        result = run_ingestion(db_session, provider, amount=1)

    assert provider.calls == 3
    assert result.inserted == 1
    assert result.errors == []


def test_run_ingestion_records_error_after_exhausting_retries(db_session):
    provider = FakeProvider(error_then_batch=(99, []))

    with patch("app.ingestion.time.sleep"):
        result = run_ingestion(db_session, provider, amount=1)

    assert provider.calls == 3
    assert result.fetched == 0
    assert len(result.errors) == 1
    assert "fetch failed" in result.errors[0]
