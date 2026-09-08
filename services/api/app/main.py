from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from .request_logging import RequestLoggingMiddleware
from .routers import auth, health, ingestion, questions, quiz, users

app = FastAPI(title="Microlearning Platform API")

# Order matters: middleware runs outside-in on the way in, inside-out on
# the way out — the LAST one added ends up OUTERMOST, running first on
# the way in. ProxyHeadersMiddleware must run before anything else reads
# request.client, so it's added last: NGINX (the only thing that can
# reach this container at all — it has no host port mapping) sets
# X-Real-IP/X-Forwarded-For, but nothing rewrites request.client.host to
# match unless something explicitly trusts and parses those headers.
# Without this, every request arrives looking like it came from NGINX's
# own container IP — which would make the rate limiter below bucket
# every real visitor together under one shared limit. `trusted_hosts="*"`
# is safe specifically because the api container has no host port
# mapping: NGINX is the only thing that can ever connect to it directly.
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(ingestion.router)
app.include_router(questions.router)
app.include_router(quiz.router)
app.include_router(users.router)
