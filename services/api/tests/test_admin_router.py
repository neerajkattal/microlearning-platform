from fastapi.testclient import TestClient

from app import models
from app.config import settings
from app.database import get_db
from app.main import app

client = TestClient(app)

BOOTSTRAP_HEADERS = {"X-Admin-Key": settings.admin_api_key}


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


def _bootstrap_and_login(db_session, username="root_admin", password="admin-pass-123"):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    resp = client.post(
        "/admin/bootstrap", json={"username": username, "password": password}, headers=BOOTSTRAP_HEADERS
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# --- bootstrap & login ---------------------------------------------------


def test_bootstrap_rejects_a_missing_or_wrong_key(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        no_key = client.post("/admin/bootstrap", json={"username": "root", "password": "admin-pass-123"})
        wrong_key = client.post(
            "/admin/bootstrap",
            json={"username": "root", "password": "admin-pass-123"},
            headers={"X-Admin-Key": "not-the-real-key"},
        )
    finally:
        app.dependency_overrides.clear()

    assert no_key.status_code == 401
    assert wrong_key.status_code == 401


def test_bootstrap_only_works_once(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        first = client.post(
            "/admin/bootstrap", json={"username": "root", "password": "admin-pass-123"}, headers=BOOTSTRAP_HEADERS
        )
        second = client.post(
            "/admin/bootstrap",
            json={"username": "someone_else", "password": "admin-pass-123"},
            headers=BOOTSTRAP_HEADERS,
        )
    finally:
        app.dependency_overrides.clear()

    assert first.status_code == 201
    assert second.status_code == 403


def test_admin_can_log_in_after_bootstrap(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        client.post(
            "/admin/bootstrap", json={"username": "root", "password": "admin-pass-123"}, headers=BOOTSTRAP_HEADERS
        )
        resp = client.post("/admin/login", json={"username": "root", "password": "admin-pass-123"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["admin_username"] == "root"
    assert len(resp.json()["access_token"]) > 20


def test_admin_login_rejects_the_wrong_password(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        client.post(
            "/admin/bootstrap", json={"username": "root", "password": "admin-pass-123"}, headers=BOOTSTRAP_HEADERS
        )
        resp = client.post("/admin/login", json={"username": "root", "password": "wrong-password"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401


def test_a_player_token_cannot_access_admin_routes(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        player_token = client.post(
            "/auth/register", json={"username": "regular_player", "password": "correct-horse"}
        ).json()["access_token"]
        resp = client.get("/admin/users", headers={"Authorization": f"Bearer {player_token}"})
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 401


def test_admin_routes_reject_a_missing_token(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        resp = client.get("/admin/users")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 403  # HTTPBearer's own "no credentials at all" response


# --- users -----------------------------------------------------------------


def test_admin_can_list_users(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        _make_user(db_session, "alice")
        _make_user(db_session, "bob")
        resp = client.get("/admin/users", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert {row["username"] for row in resp.json()} == {"alice", "bob"}


def test_admin_can_search_users_by_username_substring(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        _make_user(db_session, "bad_name_troll")
        _make_user(db_session, "regular_player")
        resp = client.get("/admin/users?search=troll", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert [row["username"] for row in resp.json()] == ["bad_name_troll"]


def test_admin_can_rename_a_user(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        user = _make_user(db_session, "bad_name_troll")
        resp = client.post(f"/admin/users/{user.id}/rename", json={"new_username": "renamed_player"}, headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["username"] == "renamed_player"


def test_admin_rename_rejects_a_banned_word(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        user = _make_user(db_session, "some_player")
        resp = client.post(f"/admin/users/{user.id}/rename", json={"new_username": "still_a_nazi_name"}, headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 422


def test_hiding_a_user_removes_them_from_the_leaderboard(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        user = _make_user(db_session, "bad_name_troll", xp=999)
        _make_user(db_session, "regular_player", xp=10)

        hide_resp = client.post(f"/admin/users/{user.id}/hide", headers=headers)
        leaderboard_resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert hide_resp.status_code == 200
    assert hide_resp.json()["hidden_from_leaderboard"] is True
    usernames = [row["username"] for row in leaderboard_resp.json()]
    assert "bad_name_troll" not in usernames
    assert "regular_player" in usernames


def test_unhiding_a_user_restores_them_to_the_leaderboard(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        user = _make_user(db_session, "previously_hidden", xp=50)
        client.post(f"/admin/users/{user.id}/hide", headers=headers)

        unhide_resp = client.post(f"/admin/users/{user.id}/unhide", headers=headers)
        leaderboard_resp = client.get("/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert unhide_resp.status_code == 200
    assert unhide_resp.json()["hidden_from_leaderboard"] is False
    assert "previously_hidden" in [row["username"] for row in leaderboard_resp.json()]


# --- categories & questions --------------------------------------------


def test_admin_can_create_and_list_a_category(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        create_resp = client.post("/admin/categories", json={"name": "Cooking", "slug": "cooking"}, headers=headers)
        list_resp = client.get("/admin/categories", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert create_resp.status_code == 201
    assert create_resp.json()["question_count"] == 0
    assert any(c["slug"] == "cooking" for c in list_resp.json())


def test_admin_can_deactivate_a_category_and_it_disappears_from_players(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        create_resp = client.post("/admin/categories", json={"name": "Cooking", "slug": "cooking"}, headers=headers)
        category_id = create_resp.json()["id"]

        client.patch(f"/admin/categories/{category_id}", json={"is_active": False}, headers=headers)
        public_resp = client.get("/categories")
    finally:
        app.dependency_overrides.clear()

    assert "cooking" not in [c["slug"] for c in public_resp.json()]


def test_admin_can_create_a_question_with_answers(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        category_id = client.post(
            "/admin/categories", json={"name": "Cooking", "slug": "cooking"}, headers=headers
        ).json()["id"]

        resp = client.post(
            "/admin/questions",
            json={
                "text": "What temperature does water boil at, in Celsius?",
                "category_id": category_id,
                "difficulty": "easy",
                "answers": [
                    {"text": "100", "is_correct": True},
                    {"text": "90", "is_correct": False},
                    {"text": "50", "is_correct": False},
                ],
            },
            headers=headers,
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 201
    body = resp.json()
    assert body["is_active"] is True
    assert len(body["answers"]) == 3
    assert sum(1 for a in body["answers"] if a["is_correct"]) == 1


def test_admin_create_question_rejects_zero_or_multiple_correct_answers(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        category_id = client.post(
            "/admin/categories", json={"name": "Cooking", "slug": "cooking"}, headers=headers
        ).json()["id"]

        resp = client.post(
            "/admin/questions",
            json={
                "text": "Bad question with two correct answers",
                "category_id": category_id,
                "difficulty": "easy",
                "answers": [
                    {"text": "A", "is_correct": True},
                    {"text": "B", "is_correct": True},
                ],
            },
            headers=headers,
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 422


def test_deactivating_a_question_removes_it_from_new_sessions(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        category_id = client.post(
            "/admin/categories", json={"name": "Cooking", "slug": "cooking"}, headers=headers
        ).json()["id"]
        question_id = client.post(
            "/admin/questions",
            json={
                "text": "Only question in this category",
                "category_id": category_id,
                "difficulty": "easy",
                "answers": [{"text": "A", "is_correct": True}, {"text": "B", "is_correct": False}],
            },
            headers=headers,
        ).json()["id"]

        client.patch(f"/admin/questions/{question_id}", json={"is_active": False}, headers=headers)

        player_token = client.post(
            "/auth/register", json={"username": "session_starter", "password": "correct-horse"}
        ).json()["access_token"]
        session_resp = client.post(
            "/quiz-sessions",
            json={"category": "cooking", "question_count": 5},
            headers={"Authorization": f"Bearer {player_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert session_resp.status_code == 404  # no active questions left for this category


# --- game config -------------------------------------------------------


def test_admin_can_view_and_update_game_config(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        default_resp = client.get("/admin/game-config", headers=headers)
        update_resp = client.patch("/admin/game-config", json={"base_correct_xp": 25}, headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert default_resp.status_code == 200
    assert default_resp.json()["base_correct_xp"] == 10  # unchanged default
    assert update_resp.status_code == 200
    assert update_resp.json()["base_correct_xp"] == 25
    assert update_resp.json()["attempt_xp"] == 2  # untouched fields keep their value


def test_updated_game_config_actually_changes_xp_awarded(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        client.patch("/admin/game-config", json={"base_correct_xp": 1000}, headers=headers)

        reg = client.post("/auth/register", json={"username": "xp_test_player", "password": "correct-horse"})
        player_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        category_id = client.post(
            "/admin/categories", json={"name": "Cooking", "slug": "cooking"}, headers=headers
        ).json()["id"]
        client.post(
            "/admin/questions",
            json={
                "text": "A question",
                "category_id": category_id,
                "difficulty": "easy",
                "answers": [{"text": "Right", "is_correct": True}, {"text": "Wrong", "is_correct": False}],
            },
            headers=headers,
        )

        session = client.post(
            "/quiz-sessions", json={"category": "cooking", "question_count": 1}, headers=player_headers
        ).json()
        sq = session["questions"][0]

        # find the actually-correct answer id via the admin question view
        admin_question = client.get(f"/admin/questions?category_id={category_id}", headers=headers).json()[0]
        correct_answer_id = next(a["id"] for a in admin_question["answers"] if a["is_correct"])

        answer_resp = client.post(
            f"/quiz-sessions/{session['id']}/questions/{sq['session_question_id']}/answer",
            json={"selected_answer_id": correct_answer_id, "response_time_ms": 1000},
            headers=player_headers,
        )
    finally:
        app.dependency_overrides.clear()

    assert answer_resp.status_code == 200
    assert answer_resp.json()["xp_earned"] >= 1000  # base alone dwarfs any bonus


# --- stats & activity ----------------------------------------------------


def test_stats_reflects_real_counts(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        _make_user(db_session, "someone")
        resp = client.get("/admin/stats", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["total_users"] >= 1
    assert "questions_per_category" in body


def test_registering_and_logging_in_appear_in_the_activity_feed(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        client.post("/auth/register", json={"username": "activity_test_user", "password": "correct-horse"})
        client.post("/auth/login", json={"username": "activity_test_user", "password": "correct-horse"})

        resp = client.get("/admin/activity", headers=headers)
    finally:
        app.dependency_overrides.clear()

    event_types = [row["event_type"] for row in resp.json() if row["username"] == "activity_test_user"]
    assert "user_registered" in event_types
    assert "user_login" in event_types


# --- topic requests -------------------------------------------------------


def test_admin_sees_a_pending_topic_request(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        player_token = client.post(
            "/auth/register", json={"username": "topic_requester", "password": "correct-horse"}
        ).json()["access_token"]
        client.post(
            "/topic-requests", json={"topic": "K-pop"}, headers={"Authorization": f"Bearer {player_token}"}
        )

        resp = client.get("/admin/topic-requests", headers=headers)
        stats_resp = client.get("/admin/stats", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert any(r["topic"] == "K-pop" and r["status"] == "pending" for r in resp.json())
    assert stats_resp.json()["pending_topic_requests"] >= 1


def test_admin_can_dismiss_a_topic_request(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        player_token = client.post(
            "/auth/register", json={"username": "topic_requester_2", "password": "correct-horse"}
        ).json()["access_token"]
        created = client.post(
            "/topic-requests", json={"topic": "Cricket stats"}, headers={"Authorization": f"Bearer {player_token}"}
        ).json()

        dismiss_resp = client.post(f"/admin/topic-requests/{created['id']}/dismiss", headers=headers)
        pending_resp = client.get("/admin/topic-requests", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert dismiss_resp.status_code == 200
    assert dismiss_resp.json()["status"] == "dismissed"
    assert all(r["id"] != created["id"] for r in pending_resp.json())


def test_admin_can_fulfill_a_topic_request(db_session):
    headers = _bootstrap_and_login(db_session)
    try:
        player_token = client.post(
            "/auth/register", json={"username": "topic_requester_3", "password": "correct-horse"}
        ).json()["access_token"]
        created = client.post(
            "/topic-requests", json={"topic": "Formula 1"}, headers={"Authorization": f"Bearer {player_token}"}
        ).json()

        resp = client.post(f"/admin/topic-requests/{created['id']}/fulfill", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["status"] == "fulfilled"
