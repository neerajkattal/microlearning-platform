# Start Here — Microlearning Platform

This repository is a learning-focused, production-oriented microlearning platform.

## Product

Users answer multiple-choice questions through short interactive games.

Initial games:
- Lane Rush — steer into one of four answer lanes.
- Balloon Pop — pop one of four answer balloons.

## Core principle

One shared question/quiz system powers many game experiences.

```text
OpenTDB / Internal / Future Sources
            ↓
      Question Ingestion
            ↓
         PostgreSQL
            ↓
       Quiz Engine
        ↙        ↘
   Lane Rush   Balloon Pop
            ↓
       Answer Attempt
            ↓
      Server Validation
            ↓
      Score / XP / Streak
```

## Initial technical stack

- Next.js + TypeScript
- FastAPI + Python
- PostgreSQL
- SQLAlchemy + Alembic
- Redis
- Phaser 4
- NGINX
- Docker + Docker Compose
- CI/CD
- AWS later
- Kubernetes later

## Question strategy

OpenTDB is the initial external content provider. Questions are ingested and normalized into our database rather than fetched directly during each gameplay request.

The internal model must retain source/provenance/license information.

## Development philosophy

Local first. Production minded.

The project should demonstrate understanding of:
- API boundaries
- database design
- caching
- background workers
- reverse proxies
- security
- observability
- CI/CD
- AWS deployment
- Kubernetes and resilience

Do not optimize for architecture diagrams that have no product reason.

## First user-visible milestone

Before gameplay, prove this:

```text
Browser
  ↓
NGINX
  ↓
Next.js
  ↓
FastAPI
  ↓
PostgreSQL / Redis
```

Then add question ingestion, quiz sessions, and finally the first game.
