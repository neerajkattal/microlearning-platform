from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, health, ingestion, questions, quiz, users

app = FastAPI(title="Microlearning Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(ingestion.router)
app.include_router(questions.router)
app.include_router(quiz.router)
app.include_router(users.router)
