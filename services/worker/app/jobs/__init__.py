"""Job registry: each job runs on its own schedule, not every worker poll
tick (see app.main.run — connectivity checks run every tick, jobs only run
once their own interval_seconds has elapsed). Register a job by importing
its module here so its module-level `register(...)` call executes."""

from dataclasses import dataclass
from typing import Callable

JobFn = Callable[[], None]


# One job's schedule: a name (for logging), how often to run (seconds),
# and the zero-argument function to call.
@dataclass
class ScheduledJob:
    name: str
    interval_seconds: float
    fn: JobFn


# Every job the worker knows about, keyed by name. Populated by each job
# module's own register() call at import time (see the imports below).
JOB_REGISTRY: dict[str, ScheduledJob] = {}


# Adds a job to the registry so the main loop picks it up.
def register(job: ScheduledJob) -> None:
    JOB_REGISTRY[job.name] = job


from . import ingest_opentdb  # noqa: E402,F401  (import for its registration side-effect)
from . import ingest_quizapi  # noqa: E402,F401  (import for its registration side-effect)
