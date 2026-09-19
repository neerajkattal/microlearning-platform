import logging

from ..config import settings
from . import ScheduledJob, register
from ._ingestion_trigger import trigger_ingestion

logger = logging.getLogger("worker.jobs.ingest_opentdb")


def trigger_opentdb_ingestion() -> None:
    trigger_ingestion(
        endpoint="/ingestion/opentdb",
        amount=settings.opentdb_ingestion_amount,
        max_retries=settings.opentdb_ingestion_max_retries,
        backoff_base_seconds=settings.opentdb_ingestion_backoff_base_seconds,
        logger=logger,
    )


register(
    ScheduledJob(
        name="ingest_opentdb",
        interval_seconds=settings.opentdb_ingestion_interval_seconds,
        fn=trigger_opentdb_ingestion,
    )
)
