from fastapi.testclient import TestClient

from app import models
from app.config import settings
from app.database import get_db
from app.main import app

client = TestClient(app)

ADMIN_HEADERS = {"X-Admin-Key": settings.admin_api_key}


def _override_get_db(session):
    def _get_db():
        yield session

    return _get_db


def _make_user(db_session, username, xp=0):
    user = models.User(username=username, password_hash="not-a-real-hash")
    db_session.add(user)
    db_session.flush()
    db_session.add(models.UserStats(user_id=user.id, xp=xp, level=1))
    db_session.commit()
    db_session.refresh(user)
    return user


def test_admin_routes_reject_a_missing_key(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/admin/users")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401


def test_admin_routes_reject_the_wrong_key(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/admin/users", headers={"X-Admin-Key": "not-the-real-key"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401


def test_admin_can_list_users(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        _make_user(db_session, "alice")
        _make_user(db_session, "bob")

        resp = client.get("/admin/users", headers=ADMIN_HEADERS)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    usernames = {row["username"] for row in resp.json()}
    assert usernames == {"alice", "bob"}


def test_admin_can_search_users_by_username_substring(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        _make_user(db_session, "bad_name_troll")
        _make_user(db_session, "regular_player")

        resp = client.get("/admin/users?search=troll", headers=ADMIN_HEADERS)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert [row["username"] for row in resp.json()] == ["bad_name_troll"]


def test_admin_can_rename_a_user(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        user = _make_user(db_session, "bad_name_troll")
        resp = client.post(
            f"/admin/users/{user.id}/rename", json={"new_username": "renamed_player"}, headers=ADMIN_HEADERS
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["username"] == "renamed_player"


def test_admin_rename_rejects_a_banned_word(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        user = _make_user(db_session, "some_player")
        resp = client.post(
            f"/admin/users/{user.id}/rename", json={"new_username": "still_a_nazi_name"}, headers=ADMIN_HEADERS
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 422


def test_admin_rename_rejects_a_name_already_taken(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        _make_user(db_session, "taken_name")
        user = _make_user(db_session, "bad_name_troll")
        resp = client.post(
            f"/admin/users/{user.id}/rename", json={"new_username": "taken_name"}, headers=ADMIN_HEADERS
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 409


def test_admin_rename_404s_for_an_unknown_user(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.post(
            "/admin/users/999999/rename", json={"new_username": "whoever"}, headers=ADMIN_HEADERS
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 404


def test_hiding_a_user_removes_them_from_the_leaderboard(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        user = _make_user(db_session, "bad_name_troll", xp=999)
        _make_user(db_session, "regular_player", xp=10)

        hide_resp = client.post(f"/admin/users/{user.id}/hide", headers=ADMIN_HEADERS)
        leaderboard_resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert hide_resp.status_code == 200
    assert hide_resp.json()["hidden_from_leaderboard"] is True
    usernames = [row["username"] for row in leaderboard_resp.json()]
    assert "bad_name_troll" not in usernames
    assert "regular_player" in usernames


def test_unhiding_a_user_restores_them_to_the_leaderboard(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        user = _make_user(db_session, "previously_hidden", xp=50)
        client.post(f"/admin/users/{user.id}/hide", headers=ADMIN_HEADERS)

        unhide_resp = client.post(f"/admin/users/{user.id}/unhide", headers=ADMIN_HEADERS)
        leaderboard_resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert unhide_resp.status_code == 200
    assert unhide_resp.json()["hidden_from_leaderboard"] is False
    assert "previously_hidden" in [row["username"] for row in leaderboard_resp.json()]
