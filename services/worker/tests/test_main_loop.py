from unittest.mock import MagicMock, patch

from app.jobs import JOB_REGISTRY, ScheduledJob
from app.main import run


def test_run_completes_after_max_iterations_without_hanging():
    """Smoke test: the loop runs, checks connectivity, and returns instead
    of blocking forever, given a bounded max_iterations and a zeroed sleep."""
    with (
        patch("app.main.make_engine"),
        patch("app.main.make_redis"),
        patch("app.main.check_database", return_value=True) as db_check,
        patch("app.main.check_redis", return_value=True) as redis_check,
        patch("app.main.time.sleep"),
        patch("httpx.post"),  # the registered ingest_opentdb job would otherwise make a real call
    ):
        run(max_iterations=2)

    assert db_check.call_count == 2
    assert redis_check.call_count == 2


def test_scheduled_job_runs_on_first_tick_then_waits_out_its_interval():
    fake_job = MagicMock()
    JOB_REGISTRY["_test_job"] = ScheduledJob(name="_test_job", interval_seconds=3600, fn=fake_job)
    try:
        with (
            patch("app.main.make_engine"),
            patch("app.main.make_redis"),
            patch("app.main.check_database", return_value=True),
            patch("app.main.check_redis", return_value=True),
            patch("app.main.time.sleep"),
            patch("httpx.post"),
        ):
            run(max_iterations=3)
    finally:
        del JOB_REGISTRY["_test_job"]

    # Fires on the first tick (nothing has ever run), then its 3600s
    # interval means it should NOT fire again within just 3 quick ticks.
    assert fake_job.call_count == 1


def test_first_run_fires_even_when_the_monotonic_clock_starts_small():
    """Regression test: time.monotonic()'s absolute value is unspecified —
    it can start near 0 depending on the platform. Caught live in docker
    compose: with a naive `last_run.get(name, 0.0)` default, a small clock
    value made `now - 0.0 < interval_seconds` true, silently skipping the
    job's first run entirely. Must fire regardless of the clock's origin."""
    fake_job = MagicMock()
    JOB_REGISTRY["_test_job"] = ScheduledJob(name="_test_job", interval_seconds=3600, fn=fake_job)
    try:
        with (
            patch("app.main.make_engine"),
            patch("app.main.make_redis"),
            patch("app.main.check_database", return_value=True),
            patch("app.main.check_redis", return_value=True),
            patch("app.main.time.sleep"),
            patch("app.main.time.monotonic", return_value=1.0),  # small, like a fresh container
            patch("httpx.post"),
        ):
            run(max_iterations=1)
    finally:
        del JOB_REGISTRY["_test_job"]

    assert fake_job.call_count == 1


def test_a_failing_job_does_not_crash_the_loop():
    failing_job = MagicMock(side_effect=RuntimeError("boom"))
    JOB_REGISTRY["_test_failing_job"] = ScheduledJob(name="_test_failing_job", interval_seconds=0, fn=failing_job)
    try:
        with (
            patch("app.main.make_engine"),
            patch("app.main.make_redis"),
            patch("app.main.check_database", return_value=True),
            patch("app.main.check_redis", return_value=True),
            patch("app.main.time.sleep"),
            patch("httpx.post"),
        ):
            run(max_iterations=2)
    finally:
        del JOB_REGISTRY["_test_failing_job"]

    # interval_seconds=0 means it's due every tick; the loop must survive
    # both calls rather than dying on the first exception.
    assert failing_job.call_count == 2
