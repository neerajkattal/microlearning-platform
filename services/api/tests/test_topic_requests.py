from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app

client = TestClient(app)


def _override_get_db(session):
    def _get_db():
        yield session

    return _get_db


def _register(username):
    resp = client.post("/auth/register", json={"username": username, "password": "correct-horse"})
    return resp.json()["access_token"]


def test_requesting_a_topic_creates_a_pending_request(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        token = _register("requester_one")
        resp = client.post(
            "/topic-requests", json={"topic": "K-pop"}, headers={"Authorization": f"Bearer {token}"}
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 201
    body = resp.json()
    assert body["topic"] == "K-pop"
    assert body["status"] == "pending"
    assert body["request_count"] == 1
    assert body["requested_by_username"] == "requester_one"


def test_requesting_the_same_topic_again_increments_the_count_instead_of_duplicating(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        token_a = _register("requester_a")
        token_b = _register("requester_b")
        client.post("/topic-requests", json={"topic": "K-pop"}, headers={"Authorization": f"Bearer {token_a}"})
        # Different case/whitespace - should still match the same request.
        resp = client.post(
            "/topic-requests", json={"topic": "  k-pop  "}, headers={"Authorization": f"Bearer {token_b}"}
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["request_count"] == 2


def test_topic_request_requires_authentication(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/topic-requests", json={"topic": "K-pop"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 403
