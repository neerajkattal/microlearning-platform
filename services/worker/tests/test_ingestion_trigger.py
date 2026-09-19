import logging
from unittest.mock import MagicMock, patch

import httpx

from app.jobs._ingestion_trigger import trigger_ingestion

logger = logging.getLogger("test")


def _call(**overrides):
    kwargs = dict(endpoint="/ingestion/opentdb", amount=20, max_retries=3, backoff_base_seconds=1.0, logger=logger)
    kwargs.update(overrides)
    trigger_ingestion(**kwargs)


def test_posts_to_the_configured_endpoint_with_amount_and_admin_key():
    with patch("app.jobs._ingestion_trigger.settings") as mock_settings, patch(
        "app.jobs._ingestion_trigger.httpx.post"
    ) as mock_post:
        mock_settings.api_base_url = "http://api:8000"
        mock_settings.admin_api_key = "test-secret"
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"inserted": 5})

        _call(endpoint="/ingestion/quizapi", amount=7)

    args, kwargs = mock_post.call_args
    assert args[0] == "http://api:8000/ingestion/quizapi"
    assert kwargs["json"] == {"amount": 7}
    assert kwargs["headers"] == {"X-Admin-Key": "test-secret"}
    assert mock_post.call_count == 1


def test_retries_and_eventually_succeeds_after_a_transient_failure():
    success = MagicMock(status_code=200, json=lambda: {"inserted": 3})
    with patch("app.jobs._ingestion_trigger.httpx.post") as mock_post, patch(
        "app.jobs._ingestion_trigger.time.sleep"
    ) as mock_sleep:
        mock_post.side_effect = [httpx.ConnectError("no route"), success]
        _call()

    assert mock_post.call_count == 2
    mock_sleep.assert_called_once()


def test_does_not_raise_when_the_api_is_unreachable_after_exhausting_retries():
    with patch("app.jobs._ingestion_trigger.httpx.post", side_effect=httpx.ConnectError("no route")), patch(
        "app.jobs._ingestion_trigger.time.sleep"
    ):
        _call()  # must not raise - a failed job shouldn't crash the worker loop


def test_gives_up_after_the_configured_max_retries():
    with patch("app.jobs._ingestion_trigger.httpx.post") as mock_post, patch("app.jobs._ingestion_trigger.time.sleep"):
        mock_post.side_effect = httpx.ConnectError("no route")
        _call(max_retries=4)

    assert mock_post.call_count == 4


def test_does_not_raise_on_a_non_2xx_response():
    with patch("app.jobs._ingestion_trigger.httpx.post") as mock_post, patch("app.jobs._ingestion_trigger.time.sleep"):
        response = MagicMock(status_code=401)
        response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "unauthorized", request=MagicMock(), response=response
        )
        mock_post.return_value = response
        _call()
