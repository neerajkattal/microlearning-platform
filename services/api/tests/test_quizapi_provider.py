from unittest.mock import MagicMock

from app.question_sources.quizapi import QuizApiProvider

MULTIPLE_CHOICE_ITEM = {
    "id": "q1",
    "text": "What does CI stand for?",
    "type": "MULTIPLE_CHOICE",
    "difficulty": "EASY",
    "category": "DevOps",
    "answers": [
        {"id": "a1", "text": "Continuous Integration", "isCorrect": True},
        {"id": "a2", "text": "Code Injection", "isCorrect": False},
        {"id": "a3", "text": "Continuous Instance", "isCorrect": False},
        {"id": "a4", "text": "Central Index", "isCorrect": False},
    ],
}

TRUE_FALSE_ITEM = {
    "id": "q2",
    "text": "Docker containers share the host OS kernel.",
    "type": "TRUE_FALSE",
    "difficulty": "MEDIUM",
    "category": "DevOps",
    "answers": [
        {"id": "b1", "text": "True", "isCorrect": True},
        {"id": "b2", "text": "False", "isCorrect": False},
    ],
}


def _fake_client(json_body: dict, status_code: int = 200) -> MagicMock:
    client = MagicMock()
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_body
    response.raise_for_status.return_value = None
    client.get.return_value = response
    return client


def test_fetch_batch_normalizes_a_multiple_choice_question():
    client = _fake_client({"success": True, "data": [MULTIPLE_CHOICE_ITEM]})
    provider = QuizApiProvider(api_key="test-key", client=client)

    questions = provider.fetch_batch(amount=1)

    assert len(questions) == 1
    q = questions[0]
    assert q.source == "quizapi"
    assert q.source_question_id == "q1"
    assert q.category == "DevOps"
    assert q.difficulty == "easy"  # lowercased to match our convention
    assert q.correct_answer == "Continuous Integration"
    assert set(q.incorrect_answers) == {"Code Injection", "Continuous Instance", "Central Index"}


def test_fetch_batch_filters_out_true_false_questions():
    # Both games hardcode exactly 4 answer choices - a 2-answer
    # TRUE_FALSE item can't be rendered by either one.
    client = _fake_client({"success": True, "data": [MULTIPLE_CHOICE_ITEM, TRUE_FALSE_ITEM]})
    provider = QuizApiProvider(api_key="test-key", client=client)

    questions = provider.fetch_batch(amount=2)

    assert len(questions) == 1
    assert questions[0].source_question_id == "q1"


def test_fetch_batch_returns_empty_list_when_the_api_reports_failure():
    provider = QuizApiProvider(api_key="test-key", client=_fake_client({"success": False}))

    assert provider.fetch_batch(amount=5) == []


def test_fetch_batch_sends_the_bearer_token_and_caps_limit_at_50():
    client = _fake_client({"success": True, "data": []})
    provider = QuizApiProvider(api_key="secret-key-123", client=client)

    provider.fetch_batch(amount=200)

    _, kwargs = client.get.call_args
    assert kwargs["params"] == {"limit": 50}
    assert kwargs["headers"] == {"Authorization": "Bearer secret-key-123"}


def test_fetch_batch_passes_category_through_as_a_query_param():
    client = _fake_client({"success": True, "data": []})
    provider = QuizApiProvider(api_key="test-key", client=client)

    provider.fetch_batch(amount=5, category="DevOps")

    _, kwargs = client.get.call_args
    assert kwargs["params"]["category"] == "DevOps"
