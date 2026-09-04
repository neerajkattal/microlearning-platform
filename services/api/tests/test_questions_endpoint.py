from fastapi.testclient import TestClient

from app import models
from app.database import get_db
from app.main import app

client = TestClient(app)


def _override_get_db(session):
    def _get_db():
        yield session

    return _get_db


def _seed(db_session):
    category_a = models.Category(name="Math", slug="math")
    category_b = models.Category(name="History", slug="history")
    source = models.QuestionSource(name="opentdb")
    db_session.add_all([category_a, category_b, source])
    db_session.flush()

    q1 = models.Question(
        text="2+2?", category_id=category_a.id, difficulty="easy", source_id=source.id, source_question_id="h1"
    )
    q2 = models.Question(
        text="Capital of Rome?",
        category_id=category_b.id,
        difficulty="medium",
        source_id=source.id,
        source_question_id="h2",
    )
    db_session.add_all([q1, q2])
    db_session.commit()
    return category_a, category_b, q1, q2


def test_list_categories_includes_question_counts(db_session):
    category_a, category_b, *_ = _seed(db_session)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/categories")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    by_slug = {c["slug"]: c for c in resp.json()}
    assert by_slug["math"]["question_count"] == 1
    assert by_slug["history"]["question_count"] == 1


def test_list_questions_filters_by_category(db_session):
    _seed(db_session)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/questions", params={"category": "math"})
    finally:
        app.dependency_overrides.clear()

    body = resp.json()
    assert len(body) == 1
    assert body[0]["text"] == "2+2?"
    assert "answers" not in body[0]
    assert "is_correct" not in body[0]


def test_list_questions_filters_by_difficulty(db_session):
    _seed(db_session)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/questions", params={"difficulty": "medium"})
    finally:
        app.dependency_overrides.clear()

    body = resp.json()
    assert len(body) == 1
    assert body[0]["text"] == "Capital of Rome?"


def test_get_question_by_id(db_session):
    _, _, q1, _ = _seed(db_session)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get(f"/questions/{q1.id}")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["text"] == "2+2?"


def test_get_question_404_when_missing(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/questions/999")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 404
