import logging
import time

import httpx

from ..config import settings
from . import ScheduledJob, register

logger = logging.getLogger("worker.jobs.ingest_opentdb")


def trigger_opentdb_ingestion() -> None:
    """Ask the api to fetch+persist a batch of OpenTDB questions. The
    worker doesn't touch OpenTDB or Postgres directly for this — it just
    triggers the api's /ingestion/opentdb endpoint, which owns the actual
    fetch/normalize/dedupe/persist logic (see docs/decisions/ADR-0003).

    Retries with exponential backoff on failure — the api being briefly
    unreachable (e.g. still starting up right after a `docker compose
    up --build`, the exact race that caused a real logged failure once)
    shouldn't mean silently skipping this run entirely until the next
    scheduled interval, which could be an hour away."""
    url = f"{settings.api_base_url}/ingestion/opentdb"
    last_error: httpx.HTTPError | None = None

    for attempt in range(1, settings.opentdb_ingestion_max_retries + 1):
        try:
            response = httpx.post(url, json={"amount": settings.opentdb_ingestion_amount}, timeout=15.0)
            response.raise_for_status()
            logger.info(f"opentdb ingestion triggered result={response.json()}")
            return
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt < settings.opentdb_ingestion_max_retries:
                delay = settings.opentdb_ingestion_backoff_base_seconds * (2 ** (attempt - 1))
                logger.warning(f"opentdb ingestion trigger attempt {attempt} failed ({exc!r}), retrying in {delay}s")
                time.sleep(delay)

    logger.error(
        f"opentdb ingestion trigger failed after {settings.opentdb_ingestion_max_retries} attempts: {last_error!r}"
    )


register(
    ScheduledJob(
        name="ingest_opentdb",
        interval_seconds=settings.opentdb_ingestion_interval_seconds,
        fn=trigger_opentdb_ingestion,
    )
)
