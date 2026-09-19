from unittest.mock import patch

from app.jobs import JOB_REGISTRY
from app.jobs.ingest_quizapi import trigger_quizapi_ingestion


def test_job_is_registered_with_configured_interval():
    from app.config import settings

    job = JOB_REGISTRY["ingest_quizapi"]
    assert job.interval_seconds == settings.quizapi_ingestion_interval_seconds


def test_trigger_delegates_to_the_shared_ingestion_trigger_with_quizapi_settings():
    from app.config import settings

    with patch("app.jobs.ingest_quizapi.trigger_ingestion") as mock_trigger:
        trigger_quizapi_ingestion()

    mock_trigger.assert_called_once()
    _, kwargs = mock_trigger.call_args
    assert kwargs["endpoint"] == "/ingestion/quizapi"
    assert kwargs["amount"] == settings.quizapi_ingestion_amount
    assert kwargs["max_retries"] == settings.quizapi_ingestion_max_retries
