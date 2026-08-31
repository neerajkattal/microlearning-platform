from unittest.mock import patch

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
    ):
        run(max_iterations=2)

    assert db_check.call_count == 2
    assert redis_check.call_count == 2
