from unittest.mock import patch

from app.jobs import JOB_REGISTRY
from app.jobs.ingest_opentdb import trigger_opentdb_ingestion


def test_job_is_registered_with_configured_interval():
    from app.config import settings

    job = JOB_REGISTRY["ingest_opentdb"]
    assert job.interval_seconds == settings.opentdb_ingestion_interval_seconds


def test_trigger_delegates_to_the_shared_ingestion_trigger_with_opentdb_settings():
    from app.config import settings

    with patch("app.jobs.ingest_opentdb.trigger_ingestion") as mock_trigger:
        trigger_opentdb_ingestion()

    mock_trigger.assert_called_once()
    _, kwargs = mock_trigger.call_args
    assert kwargs["endpoint"] == "/ingestion/opentdb"
    assert kwargs["amount"] == settings.opentdb_ingestion_amount
    assert kwargs["max_retries"] == settings.opentdb_ingestion_max_retries
