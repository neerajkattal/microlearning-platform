import logging

from ..config import settings
from . import ScheduledJob, register
from ._ingestion_trigger import trigger_ingestion

logger = logging.getLogger("worker.jobs.ingest_opentdb")


# The scheduled job body: triggers the API's OpenTDB ingestion endpoint
# with this job's configured amount/retry settings.
def trigger_opentdb_ingestion() -> None:
    trigger_ingestion(
        endpoint="/ingestion/opentdb",
        amount=settings.opentdb_ingestion_amount,
        max_retries=settings.opentdb_ingestion_max_retries,
        backoff_base_seconds=settings.opentdb_ingestion_backoff_base_seconds,
        logger=logger,
    )


# Registers this job with the worker's schedule at import time.
register(
    ScheduledJob(
        name="ingest_opentdb",
        interval_seconds=settings.opentdb_ingestion_interval_seconds,
        fn=trigger_opentdb_ingestion,
    )
)
