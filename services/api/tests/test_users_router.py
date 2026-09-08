from fastapi.testclient import TestClient

from app import models
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


def test_me_returns_zeroed_stats_and_no_achievements_for_a_fresh_user(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        token = _register("stats_user")
        resp = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["username"] == "stats_user"
    assert body["stats"]["xp"] == 0
    assert body["stats"]["level"] == 1
    assert body["achievements"] == []


def test_me_requires_authentication(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/users/me")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 403


def test_leaderboard_orders_users_by_xp_descending(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        for username, xp in [("low_scorer", 10), ("high_scorer", 500), ("mid_scorer", 100)]:
            user = models.User(username=username, password_hash="not-a-real-hash")
            db_session.add(user)
            db_session.flush()
            db_session.add(models.UserStats(user_id=user.id, xp=xp, level=1))
        db_session.commit()

        resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    usernames_in_order = [entry["username"] for entry in resp.json()]
    assert usernames_in_order == ["high_scorer", "mid_scorer", "low_scorer"]


def test_leaderboard_respects_the_limit_query_param(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        for i in range(5):
            user = models.User(username=f"user{i}", password_hash="not-a-real-hash")
            db_session.add(user)
            db_session.flush()
            db_session.add(models.UserStats(user_id=user.id, xp=i, level=1))
        db_session.commit()

        resp = client.get("/leaderboard?limit=2")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert len(resp.json()) == 2
