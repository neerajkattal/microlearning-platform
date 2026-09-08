from unittest.mock import MagicMock, patch

from app.jobs import JOB_REGISTRY
from app.jobs.ingest_opentdb import trigger_opentdb_ingestion


def test_job_is_registered_with_configured_interval():
    from app.config import settings

    job = JOB_REGISTRY["ingest_opentdb"]
    assert job.interval_seconds == settings.opentdb_ingestion_interval_seconds


def test_trigger_posts_to_the_api_with_configured_amount():
    with patch("app.jobs.ingest_opentdb.httpx.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"inserted": 5})
        trigger_opentdb_ingestion()

    args, kwargs = mock_post.call_args
    assert args[0].endswith("/ingestion/opentdb")
    assert kwargs["json"]["amount"] > 0
    assert mock_post.call_count == 1  # succeeded on the first attempt, no retry needed


def test_trigger_retries_and_eventually_succeeds_after_a_transient_failure():
    import httpx

    success = MagicMock(status_code=200, json=lambda: {"inserted": 3})
    with patch("app.jobs.ingest_opentdb.httpx.post") as mock_post, patch(
        "app.jobs.ingest_opentdb.time.sleep"
    ) as mock_sleep:
        mock_post.side_effect = [httpx.ConnectError("no route"), success]
        trigger_opentdb_ingestion()

    assert mock_post.call_count == 2
    mock_sleep.assert_called_once()  # backed off exactly once, between the two attempts


def test_trigger_does_not_raise_when_the_api_is_unreachable_after_exhausting_retries():
    import httpx

    with patch("app.jobs.ingest_opentdb.httpx.post", side_effect=httpx.ConnectError("no route")), patch(
        "app.jobs.ingest_opentdb.time.sleep"
    ):
        trigger_opentdb_ingestion()  # must not raise — a failed job shouldn't crash the loop


def test_trigger_gives_up_after_the_configured_max_retries():
    import httpx
    from app.config import settings

    with patch("app.jobs.ingest_opentdb.httpx.post") as mock_post, patch("app.jobs.ingest_opentdb.time.sleep"):
        mock_post.side_effect = httpx.ConnectError("no route")
        trigger_opentdb_ingestion()

    assert mock_post.call_count == settings.opentdb_ingestion_max_retries


def test_trigger_does_not_raise_on_a_non_2xx_response():
    import httpx

    with patch("app.jobs.ingest_opentdb.httpx.post") as mock_post, patch("app.jobs.ingest_opentdb.time.sleep"):
        response = MagicMock(status_code=500)
        response.raise_for_status.side_effect = httpx.HTTPStatusError("server error", request=MagicMock(), response=response)
        mock_post.return_value = response
        trigger_opentdb_ingestion()
