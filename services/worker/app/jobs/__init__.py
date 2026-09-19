"""Job registry: each job runs on its own schedule, not every worker poll
tick (see app.main.run — connectivity checks run every tick, jobs only run
once their own interval_seconds has elapsed). Register a job by importing
its module here so its module-level `register(...)` call executes."""

from dataclasses import dataclass
from typing import Callable

JobFn = Callable[[], None]


@dataclass
class ScheduledJob:
    name: str
    interval_seconds: float
    fn: JobFn


JOB_REGISTRY: dict[str, ScheduledJob] = {}


def register(job: ScheduledJob) -> None:
    JOB_REGISTRY[job.name] = job


from . import ingest_opentdb  # noqa: E402,F401  (import for its registration side-effect)
from . import ingest_quizapi  # noqa: E402,F401  (import for its registration side-effect)
