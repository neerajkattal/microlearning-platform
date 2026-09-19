import logging

from ..config import settings
from . import ScheduledJob, register
from ._ingestion_trigger import trigger_ingestion

logger = logging.getLogger("worker.jobs.ingest_quizapi")


def trigger_quizapi_ingestion() -> None:
    trigger_ingestion(
        endpoint="/ingestion/quizapi",
        amount=settings.quizapi_ingestion_amount,
        max_retries=settings.quizapi_ingestion_max_retries,
        backoff_base_seconds=settings.quizapi_ingestion_backoff_base_seconds,
        logger=logger,
    )


register(
    ScheduledJob(
        name="ingest_quizapi",
        interval_seconds=settings.quizapi_ingestion_interval_seconds,
        fn=trigger_quizapi_ingestion,
    )
)
