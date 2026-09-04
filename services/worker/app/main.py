import logging
import signal
import time
from typing import Optional

from .connectivity import check_database, check_redis, make_engine, make_redis
from .config import settings
from .jobs import JOB_REGISTRY

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":%(message)r}',
)
logger = logging.getLogger("worker")

_shutdown_requested = False


def _handle_shutdown_signal(signum, frame):
    global _shutdown_requested
    logger.info("shutdown signal received, finishing current cycle")
    _shutdown_requested = True


def run(max_iterations: Optional[int] = None) -> None:
    """The worker's main loop. `max_iterations` lets tests run this without
    looping forever; production entry (`__main__`) leaves it unbounded."""
    engine = make_engine()
    redis_client = make_redis()

    logger.info(
        f"worker starting env={settings.worker_env} "
        f"jobs_registered={len(JOB_REGISTRY)}"
    )

    # `None` means "never run" — this must not be a magic 0.0 sentinel
    # compared against time.monotonic(), since that clock's absolute value
    # is unspecified (may start near 0, may be large) and a small enough
    # value would make `now - 0.0 < interval_seconds` true, silently
    # skipping a job's very first run. (Caught via docker compose: the
    # ingest_opentdb job never fired on worker startup with that version.)
    last_run: dict[str, Optional[float]] = {}
    iterations = 0
    while not _shutdown_requested:
        db_ok = check_database(engine)
        redis_ok = check_redis(redis_client)
        logger.info(f"connectivity check database={db_ok} redis={redis_ok}")

        now = time.monotonic()
        for name, job in JOB_REGISTRY.items():
            previous = last_run.get(name)
            if previous is not None and now - previous < job.interval_seconds:
                continue
            logger.info(f"running job={name}")
            try:
                job.fn()
            except Exception:
                logger.exception(f"job={name} raised an exception")
            last_run[name] = now

        iterations += 1
        if max_iterations is not None and iterations >= max_iterations:
            break

        time.sleep(settings.poll_interval_seconds)

    logger.info("worker stopped")


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _handle_shutdown_signal)
    signal.signal(signal.SIGINT, _handle_shutdown_signal)
    run()
