import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Same structured-log format the worker uses (services/worker/app/main.py)
# — one consistent shape across both processes, so a log aggregator (or a
# human reading `docker compose logs`) doesn't need two different parsers.
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":%(message)r}',
)
logger = logging.getLogger("api")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Assigns a request id to every request (reusing one supplied via the
    X-Request-ID header, e.g. from an upstream proxy, rather than always
    minting a new one), logs one structured line per request, and echoes
    the id back as a response header so a client-reported issue can be
    matched to a specific server-side log line."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 2)

        response.headers["X-Request-ID"] = request_id
        logger.info(
            f"request_id={request_id} method={request.method} path={request.url.path} "
            f"status={response.status_code} duration_ms={duration_ms}"
        )
        return response
