from fastapi.testclient import TestClient

from app import models
from app.database import get_db
from app.main import app

client = TestClient(app)


def _override_get_db(session):
    def _get_db():
        yield session

    return _get_db


def _auth_headers(username="quiz_router_user"):
    resp = client.post("/auth/register", json={"username": username, "password": "correct-horse"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _seed_questions(db_session, count=3):
    category = models.Category(name="Math", slug="math")
    source = models.QuestionSource(name="opentdb")
    db_session.add_all([category, source])
    db_session.flush()

    questions = []
    for i in range(count):
        q = models.Question(
            text=f"Q{i}?", category_id=category.id, difficulty="easy", source_id=source.id, source_question_id=f"h{i}"
        )
        db_session.add(q)
        db_session.flush()
        db_session.add(models.Answer(question_id=q.id, text="right", is_correct=True))
        db_session.add_all(
            models.Answer(question_id=q.id, text=f"wrong{j}", is_correct=False) for j in range(3)
        )
        questions.append(q)
    db_session.commit()
    return questions


def test_start_session_never_leaks_is_correct(db_session):
    _seed_questions(db_session, count=2)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        headers = _auth_headers()
        resp = client.post("/quiz-sessions", json={"question_count": 2}, headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "in_progress"
    assert len(body["questions"]) == 2
    for q in body["questions"]:
        assert len(q["choices"]) == 4
        for choice in q["choices"]:
            assert set(choice.keys()) == {"id", "text"}  # no is_correct


def test_start_session_404_when_no_questions(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        headers = _auth_headers()
        resp = client.post("/quiz-sessions", json={"question_count": 1}, headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 404


def test_hint_endpoint_returns_two_ids_never_leaking_which_is_correct(db_session):
    _seed_questions(db_session, count=1)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        headers = _auth_headers("hint_router_user")
        session = client.post("/quiz-sessions", json={"question_count": 1}, headers=headers).json()
        sq = session["questions"][0]
        resp = client.post(
            f"/quiz-sessions/{session['id']}/questions/{sq['session_question_id']}/hint", headers=headers
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"eliminated_answer_ids"}  # no is_correct anywhere
    assert len(body["eliminated_answer_ids"]) == 2


def test_full_quiz_flow_start_answer_complete(db_session):
    _seed_questions(db_session, count=2)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        headers = _auth_headers()
        start = client.post("/quiz-sessions", json={"question_count": 2}, headers=headers)
        session_id = start.json()["id"]

        for q in start.json()["questions"]:
            # find the actual correct answer id directly from the DB, since
            # the API response deliberately doesn't reveal it
            db_question = db_session.get(models.Question, q["question_id"])
            correct = next(a for a in db_question.answers if a.is_correct)
            answer_resp = client.post(
                f"/quiz-sessions/{session_id}/questions/{q['session_question_id']}/answer",
                json={"selected_answer_id": correct.id, "response_time_ms": 1000},
                headers=headers,
            )
            assert answer_resp.status_code == 200
            assert answer_resp.json()["is_correct"] is True
            assert answer_resp.json()["xp_earned"] > 0

        complete_resp = client.post(f"/quiz-sessions/{session_id}/complete", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert complete_resp.status_code == 200
    body = complete_resp.json()
    assert body["score"] == 2
    assert body["total_questions"] == 2
    assert body["total_xp"] == body["xp_earned"]
    assert body["streak"] == 1


def test_answer_twice_returns_409(db_session):
    _seed_questions(db_session, count=1)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        headers = _auth_headers()
        start = client.post("/quiz-sessions", json={"question_count": 1}, headers=headers)
        sq = start.json()["questions"][0]
        answer_id = sq["choices"][0]["id"]

        first = client.post(
            f"/quiz-sessions/{start.json()['id']}/questions/{sq['session_question_id']}/answer",
            json={"selected_answer_id": answer_id},
            headers=headers,
        )
        second = client.post(
            f"/quiz-sessions/{start.json()['id']}/questions/{sq['session_question_id']}/answer",
            json={"selected_answer_id": answer_id},
            headers=headers,
        )
    finally:
        app.dependency_overrides.clear()

    assert first.status_code == 200
    assert second.status_code == 409


def test_complete_unknown_session_returns_404(db_session):
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        headers = _auth_headers()
        resp = client.post("/quiz-sessions/999/complete", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 404


def test_get_session_returns_same_shape_as_start(db_session):
    _seed_questions(db_session, count=1)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        headers = _auth_headers()
        start = client.post("/quiz-sessions", json={"question_count": 1}, headers=headers)
        fetched = client.get(f"/quiz-sessions/{start.json()['id']}", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert fetched.status_code == 200
    assert fetched.json() == start.json()


def test_a_session_is_not_visible_to_a_different_user(db_session):
    _seed_questions(db_session, count=1)
    app.dependency_overrides[get_db] = _override_get_db(db_session)
    try:
        owner_headers = _auth_headers("owner_router_user")
        intruder_headers = _auth_headers("intruder_router_user")
        start = client.post("/quiz-sessions", json={"question_count": 1}, headers=owner_headers)
        resp = client.get(f"/quiz-sessions/{start.json()['id']}", headers=intruder_headers)
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 404
