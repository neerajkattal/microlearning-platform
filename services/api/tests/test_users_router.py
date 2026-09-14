from fastapi.testclient import TestClient

from app import models
from app.database import get_db
from app.main import app
from app.redis_client import get_redis

from .conftest import FakeRedis

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


def test_me_returns_the_default_avatar_for_a_fresh_user(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        token = _register("avatar_default_user")
        resp = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    finally:
        app.dependency_overrides.clear()

    assert resp.json()["user"]["avatar"] == "astronaut"


def test_update_profile_changes_the_avatar(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        token = _register("avatar_change_user")
        resp = client.patch(
            "/users/me", json={"avatar": "robot"}, headers={"Authorization": f"Bearer {token}"}
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["avatar"] == "robot"


def test_update_profile_rejects_an_unknown_avatar(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        token = _register("avatar_reject_user")
        resp = client.patch(
            "/users/me", json={"avatar": "not-a-real-avatar"}, headers={"Authorization": f"Bearer {token}"}
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 422


def test_update_profile_requires_authentication(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.patch("/users/me", json={"avatar": "robot"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 403


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


def test_leaderboard_includes_each_player_s_avatar(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        user = models.User(username="avatar_lb_user", password_hash="not-a-real-hash", avatar="lion")
        db_session.add(user)
        db_session.flush()
        db_session.add(models.UserStats(user_id=user.id, xp=10, level=1))
        db_session.commit()

        resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert resp.json()[0]["avatar"] == "lion"


def test_leaderboard_includes_each_player_s_badge_count(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        achievement = models.Achievement(code="first_win", name="First Win", description="Answer one correctly.")
        user = models.User(username="badge_lb_user", password_hash="not-a-real-hash")
        db_session.add_all([achievement, user])
        db_session.flush()
        db_session.add(models.UserStats(user_id=user.id, xp=10, level=1))
        db_session.add(models.UserAchievement(user_id=user.id, achievement_id=achievement.id))
        db_session.commit()

        resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert resp.json()[0]["badges"] == 1


def test_leaderboard_badge_count_is_zero_for_a_player_with_none(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        user = models.User(username="no_badge_lb_user", password_hash="not-a-real-hash")
        db_session.add(user)
        db_session.flush()
        db_session.add(models.UserStats(user_id=user.id, xp=10, level=1))
        db_session.commit()

        resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert resp.json()[0]["badges"] == 0


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


def test_leaderboard_is_cached_between_requests(db_session):
    fake_redis = FakeRedis()
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    app.dependency_overrides[get_redis] = lambda: fake_redis
    try:
        user = models.User(username="cache_test_user", password_hash="not-a-real-hash")
        db_session.add(user)
        db_session.flush()
        db_session.add(models.UserStats(user_id=user.id, xp=10, level=1))
        db_session.commit()

        first = client.get("/leaderboard")
        assert first.json()[0]["xp"] == 10

        # Change the score directly, bypassing the API - the cached
        # response shouldn't reflect it until the TTL expires.
        db_session.query(models.UserStats).filter_by(user_id=user.id).update({"xp": 9999})
        db_session.commit()

        second = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert second.json() == first.json()  # still the stale, cached response
