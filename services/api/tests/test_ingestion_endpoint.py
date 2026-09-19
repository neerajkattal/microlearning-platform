from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.database import get_db
from app.main import app
from app.question_sources.provider import RawQuestion

client = TestClient(app)
ADMIN_HEADERS = {"X-Admin-Key": settings.admin_api_key}


def _override_get_db(session):
    def _get_db():
        yield session

    return _get_db


def test_ingest_opentdb_persists_and_returns_summary(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    raw = RawQuestion(
        source="opentdb",
        source_question_id=None,
        text="What is the capital of Japan?",
        category="Geography",
        difficulty="easy",
        correct_answer="Tokyo",
        incorrect_answers=["Osaka", "Kyoto", "Nagoya"],
        license=None,
    )
    try:
        with patch("app.routers.ingestion.OpenTDBProvider") as MockProvider:
            MockProvider.return_value.fetch_batch.return_value = [raw]
            resp = client.post("/ingestion/opentdb", json={"amount": 1}, headers=ADMIN_HEADERS)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["fetched"] == 1
    assert body["inserted"] == 1
    assert body["skipped_duplicate"] == 0


def test_ingest_opentdb_rejects_amount_over_cap(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/ingestion/opentdb", json={"amount": 51}, headers=ADMIN_HEADERS)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 422


def test_ingest_opentdb_requires_the_admin_key(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/ingestion/opentdb", json={"amount": 1})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401


def test_ingest_quizapi_persists_and_returns_summary(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    raw = RawQuestion(
        source="quizapi",
        source_question_id="abc123",
        text="What does CI stand for?",
        category="DevOps",
        difficulty="easy",
        correct_answer="Continuous Integration",
        incorrect_answers=["Code Injection", "Continuous Instance", "Central Index"],
        license=None,
    )
    try:
        with patch("app.routers.ingestion.QuizApiProvider") as MockProvider:
            MockProvider.return_value.fetch_batch.return_value = [raw]
            resp = client.post("/ingestion/quizapi", json={"amount": 1}, headers=ADMIN_HEADERS)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["fetched"] == 1
    assert body["inserted"] == 1
