from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_every_response_gets_a_request_id_header():
    resp = client.get("/health")
    assert "X-Request-ID" in resp.headers
    assert len(resp.headers["X-Request-ID"]) > 0


def test_a_client_supplied_request_id_is_echoed_back():
    resp = client.get("/health", headers={"X-Request-ID": "my-custom-id"})
    assert resp.headers["X-Request-ID"] == "my-custom-id"


def test_different_requests_get_different_request_ids_when_none_is_supplied():
    first = client.get("/health").headers["X-Request-ID"]
    second = client.get("/health").headers["X-Request-ID"]
    assert first != second
