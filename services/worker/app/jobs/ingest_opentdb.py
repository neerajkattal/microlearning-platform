import logging

import httpx

from ..config import settings
from . import ScheduledJob, register

logger = logging.getLogger("worker.jobs.ingest_opentdb")


def trigger_opentdb_ingestion() -> None:
    """Ask the api to fetch+persist a batch of OpenTDB questions. The
    worker doesn't touch OpenTDB or Postgres directly for this — it just
    triggers the api's /ingestion/opentdb endpoint, which owns the actual
    fetch/normalize/dedupe/persist logic (see docs/decisions/ADR-0003)."""
    url = f"{settings.api_base_url}/ingestion/opentdb"
    try:
        response = httpx.post(url, json={"amount": settings.opentdb_ingestion_amount}, timeout=15.0)
        response.raise_for_status()
        logger.info(f"opentdb ingestion triggered result={response.json()}")
    except httpx.HTTPError as exc:
        logger.error(f"opentdb ingestion trigger failed: {exc!r}")


register(
    ScheduledJob(
        name="ingest_opentdb",
        interval_seconds=settings.opentdb_ingestion_interval_seconds,
        fn=trigger_opentdb_ingestion,
    )
)
