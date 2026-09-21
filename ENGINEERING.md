# ENGINEERING.md — Microlearning Game Platform

## 1. Mission

Build a production-oriented gamified microlearning platform. The product delivers short multiple-choice learning sessions through interactive browser games.

Initial game modes:
- Lane Rush: player steers a car into one of four answer lanes.
- Balloon Pop: player pops one of four answer balloons.

The platform must be designed so that the quiz/question system is independent of the game presentation.

## 2. Primary Engineering Goal

This is both a product and a systems-engineering learning project. Prefer real, explainable architecture over unnecessary complexity.

Target architecture:

Vite + React frontend (see ADR-0002 — deviates from this pack's original Next.js default)
→ NGINX reverse proxy
→ FastAPI application API
→ PostgreSQL durable storage
→ Redis cache / short-lived state
→ background worker for question ingestion and scheduled jobs
→ external question providers such as OpenTDB

Infrastructure learning path:
Docker → Docker Compose → NGINX → CI/CD → AWS → Kubernetes → observability → resilience/scaling.

## 3. Architecture Rules

### Question/content boundary
Games must never call OpenTDB directly.

Use:
QuestionProvider interface → provider adapter → ingestion/normalization → PostgreSQL → Quiz Engine → game client.

OpenTDB is a source, not the application's source of truth.

### Quiz boundary
The Quiz Engine owns:
- question selection
- answer randomization
- quiz sessions
- answer validation
- scoring
- XP
- streak calculation

Games own:
- rendering
- input
- animation
- local game state
- presentation of question choices

### Security boundary
The browser must never be trusted to declare an answer correct.

Client sends questionId + answerId + sessionId + timing metadata.
Server loads the correct answer and determines correctness.

Never accept client-provided `isCorrect`, XP, score, or level as authoritative.

### Data boundary
External API objects must be normalized into internal domain models before use.
Do not expose raw OpenTDB response objects throughout the application.

## 4. Technology Defaults

Frontend:
- Vite + React (see ADR-0002 — was Next.js in this pack's original default)
- TypeScript
- Tailwind CSS
- Phaser 4 for game scenes

Backend:
- FastAPI
- Python
- SQLAlchemy
- Alembic

Data:
- PostgreSQL
- Redis

Infrastructure:
- Docker
- Docker Compose
- NGINX
- Git/GitHub or GitLab CI
- AWS later
- Kubernetes later

Testing:
- pytest for backend
- Vitest where useful for frontend/domain logic
- Playwright for critical browser flows

## 5. Repository Structure

Use a modular monorepo, not microservices.

```text
microlearning-platform/
├── apps/
│   └── web/
├── services/
│   ├── api/
│   └── worker/
├── packages/
│   ├── shared-types/
│   ├── quiz-engine/
│   ├── game-contracts/
│   └── question-sources/
│       └── opentdb/
├── infrastructure/
│   ├── nginx/
│   ├── docker/
│   ├── compose/
│   └── k8s/
├── prisma/
│   # Do not use Prisma; retained only if an earlier scaffold contains it.
├── migrations/
├── scripts/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── operations/
│   └── learning/
├── tests/
├── .env.example
├── docker-compose.yml
├── Makefile
├── README.md
└── ENGINEERING.md
```

If using a different exact directory layout is necessary for tooling, preserve the architectural boundaries and document the deviation.

## 6. Domain Model

Initial entities:
- User
- UserStats
- Question
- Answer
- QuestionSource
- Category
- QuizSession
- QuizSessionQuestion
- AnswerAttempt
- QuestionStatistics
- Achievement
- UserAchievement

Minimum Question fields:
- id
- text
- category
- difficulty
- explanation (nullable)
- source
- sourceQuestionId (nullable)
- license (nullable)
- createdAt
- updatedAt

Minimum Answer fields:
- id
- questionId
- text
- isCorrect

Never expose `isCorrect` to the game client.

## 7. Question Lifecycle

```text
External source
→ fetch batch
→ validate
→ decode/normalize
→ deduplicate
→ persist
→ quality metadata
→ optional cache
→ serve through Quiz Engine
```

OpenTDB ingestion must support:
- retries
- bounded batch sizes
- rate-limit awareness
- malformed response handling
- duplicate detection
- attribution/provenance storage
- idempotent re-runs

Do not fetch OpenTDB synchronously for every player question.

## 8. Game Architecture

Phaser is the game runtime. The Vite + React app remains the application shell.

Lane Rush:
- four answer lanes
- car moves forward automatically
- player controls left/right lane movement
- selecting/colliding with a lane locks the answer
- feedback is shown after server evaluation

Balloon Pop:
- four answer balloons
- player clicks/taps a balloon
- selection locks the answer
- feedback is shown after server evaluation

Both games use the same Quiz Engine and backend session contract.

## 9. Scoring

Server-authoritative scoring only.

Start simple:
- base XP for correct answers
- optional small XP for attempting a wrong answer
- speed bonus
- streak bonus
- difficulty multiplier

Do not tune the economy prematurely. Make formulas configurable and test them.

## 10. UX / Accessibility

Support:
- keyboard controls where practical
- touch/mobile controls
- visible focus
- readable contrast
- reduced-motion preference
- feedback that does not rely on color alone
- loading/error states
- graceful degraded behavior when external services are unavailable

## 11. Observability

Build toward:
- structured logs
- request IDs
- health endpoint
- readiness endpoint
- request latency
- error rate
- worker job outcome
- database/Redis connectivity checks

Later:
- Prometheus
- Grafana
- CloudWatch when running in AWS

## 12. Infrastructure Strategy

Local-first is mandatory.

Everything required for normal development should run through Docker Compose.

Initial local services:
- web
- api
- worker
- postgres
- redis
- nginx

AWS is a later environment, not a prerequisite for coding.

Use AWS carefully:
- set billing alerts/budgets before deploying paid resources
- prefer free/low-cost eligible services where practical
- keep instances small
- shut down resources when not learning/developing
- document cost assumptions

Kubernetes should first be learned locally before using a paid managed cluster.

## 13. Git / Delivery Rules

Use small, coherent commits.

Preferred commit style:
- `feat: ...`
- `fix: ...`
- `test: ...`
- `docs: ...`
- `refactor: ...`
- `chore: ...`

Do not mix large unrelated changes in one commit.

Every feature should include appropriate tests.

## 14. Documentation Rules

Architecture changes require documentation updates.

Use Architecture Decision Records for important choices:
- why a technology was selected
- alternatives considered
- tradeoffs
- consequences

Keep a learning note for major infrastructure topics so the developer can explain them in an interview.

## 15. Definition of Done

A feature is complete only when:
1. Code is typed/validated.
2. Business logic is tested.
3. Critical UI states are implemented.
4. Errors are handled.
5. Security boundaries are respected.
6. Documentation is updated when architecture changes.
7. CI checks pass.
8. Local Docker workflow still works.
9. No secrets are committed.

## 16. First Milestone

The first milestone is foundation only.

Build:
- repo structure
- local development setup
- Docker Compose
- NGINX skeleton
- Vite + React shell
- FastAPI shell
- PostgreSQL connection
- Redis connection
- worker shell
- SQLAlchemy/Alembic setup
- base domain models
- question provider interface
- OpenTDB adapter skeleton
- health endpoints
- tests
- CI baseline
- architecture documentation

Do NOT build Lane Rush or Balloon Pop during the first milestone.

The goal is to prove the engineering foundation before adding gameplay.
