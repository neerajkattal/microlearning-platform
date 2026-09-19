import logging
import time

import httpx

from ..config import settings


def trigger_ingestion(*, endpoint: str, amount: int, max_retries: int, backoff_base_seconds: float, logger: logging.Logger) -> None:
    """Shared retry/backoff logic behind every /ingestion/* job - the
    worker never touches a question source or Postgres directly for
    these, only triggers the api's own endpoint, which owns the actual
    fetch/normalize/dedupe/persist logic (see docs/decisions/ADR-0003).
    Sends the same shared secret as /admin/bootstrap (see
    auth.require_operator_key) - every /ingestion/* route requires it.

    Retries with exponential backoff on failure - the api being briefly
    unreachable (e.g. still starting up right after a `docker compose
    up --build`, the exact race that caused a real logged failure once
    for OpenTDB) shouldn't mean silently skipping this run entirely
    until the next scheduled interval, which could be an hour away."""
    url = f"{settings.api_base_url}{endpoint}"
    last_error: httpx.HTTPError | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = httpx.post(
                url,
                json={"amount": amount},
                headers={"X-Admin-Key": settings.admin_api_key},
                timeout=15.0,
            )
            response.raise_for_status()
            logger.info(f"ingestion triggered endpoint={endpoint} result={response.json()}")
            return
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt < max_retries:
                delay = backoff_base_seconds * (2 ** (attempt - 1))
                logger.warning(f"ingestion trigger attempt {attempt} for {endpoint} failed ({exc!r}), retrying in {delay}s")
                time.sleep(delay)

    logger.error(f"ingestion trigger for {endpoint} failed after {max_retries} attempts: {last_error!r}")
