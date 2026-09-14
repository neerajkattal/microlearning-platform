from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app

client = TestClient(app)


def _override_get_db(session):
    def _get_db():
        yield session

    return _get_db


def test_register_creates_a_user_and_returns_a_token(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/auth/register", json={"username": "alice", "password": "correct-horse"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["username"] == "alice"
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


def test_register_defaults_to_the_astronaut_avatar_when_none_is_chosen(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/auth/register", json={"username": "no_avatar_user", "password": "correct-horse"})
    finally:
        app.dependency_overrides.clear()

    assert resp.json()["user"]["avatar"] == "astronaut"


def test_register_accepts_a_chosen_avatar(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post(
            "/auth/register", json={"username": "avatar_picker", "password": "correct-horse", "avatar": "dragon"}
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.json()["user"]["avatar"] == "dragon"


def test_register_rejects_an_unknown_avatar(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post(
            "/auth/register",
            json={"username": "bad_avatar_user", "password": "correct-horse", "avatar": "not-a-real-avatar"},
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 422


def test_register_rejects_a_duplicate_username(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        client.post("/auth/register", json={"username": "bob", "password": "correct-horse"})
        resp = client.post("/auth/register", json={"username": "bob", "password": "another-pw"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 409


def test_register_rejects_a_too_short_password(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/auth/register", json={"username": "carol", "password": "short"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 422


def test_login_with_correct_credentials_returns_a_token(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        client.post("/auth/register", json={"username": "dave", "password": "correct-horse"})
        resp = client.post("/auth/login", json={"username": "dave", "password": "correct-horse"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["user"]["username"] == "dave"


def test_login_with_wrong_password_returns_401(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        client.post("/auth/register", json={"username": "erin", "password": "correct-horse"})
        resp = client.post("/auth/login", json={"username": "erin", "password": "wrong-password"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401


def test_login_with_unknown_username_returns_401(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/auth/login", json={"username": "nobody", "password": "whatever1"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401


def test_a_protected_endpoint_rejects_a_missing_token(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post("/quiz-sessions", json={"question_count": 1})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 403  # HTTPBearer's own rejection for a missing Authorization header


def test_a_protected_endpoint_rejects_an_invalid_token(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post(
            "/quiz-sessions",
            json={"question_count": 1},
            headers={"Authorization": "Bearer not-a-real-token"},
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401
