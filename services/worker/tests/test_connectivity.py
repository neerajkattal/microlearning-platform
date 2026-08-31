from unittest.mock import MagicMock

from app.connectivity import check_database, check_redis


def test_check_database_true_when_query_succeeds():
    engine = MagicMock()
    conn = engine.connect.return_value.__enter__.return_value
    conn.execute.return_value = None
    assert check_database(engine) is True


def test_check_database_false_when_connection_raises():
    engine = MagicMock()
    engine.connect.side_effect = ConnectionError("db down")
    assert check_database(engine) is False


def test_check_redis_true_when_ping_succeeds():
    client = MagicMock()
    client.ping.return_value = True
    assert check_redis(client) is True


def test_check_redis_false_when_ping_raises():
    client = MagicMock()
    client.ping.side_effect = ConnectionError("redis down")
    assert check_redis(client) is False
