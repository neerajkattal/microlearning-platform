from unittest.mock import MagicMock

from app.question_sources.opentdb import OpenTDBProvider

SAMPLE_RESPONSE = {
    "response_code": 0,
    "results": [
        {
            "category": "Science &amp; Nature",
            "difficulty": "easy",
            "question": "What is H&#039;s atomic number?",
            "correct_answer": "1",
            "incorrect_answers": ["2", "3", "4"],
        }
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


def test_fetch_batch_normalizes_and_unescapes_html_entities():
    provider = OpenTDBProvider(client=_fake_client(SAMPLE_RESPONSE))

    questions = provider.fetch_batch(amount=1)

    assert len(questions) == 1
    q = questions[0]
    assert q.source == "opentdb"
    assert q.text == "What is H's atomic number?"
    assert q.category == "Science & Nature"
    assert q.correct_answer == "1"
    assert q.incorrect_answers == ["2", "3", "4"]


def test_fetch_batch_returns_empty_list_on_nonzero_response_code():
    provider = OpenTDBProvider(client=_fake_client({"response_code": 1, "results": []}))

    assert provider.fetch_batch(amount=5) == []


def test_fetch_batch_passes_amount_and_type_as_query_params():
    client = _fake_client(SAMPLE_RESPONSE)
    provider = OpenTDBProvider(client=client)

    provider.fetch_batch(amount=7)

    _, kwargs = client.get.call_args
    assert kwargs["params"] == {"amount": 7, "type": "multiple"}
