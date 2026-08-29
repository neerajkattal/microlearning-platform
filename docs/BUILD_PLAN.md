# Build Plan

## Phase 0 — Foundation

Deliver:
- repository
- local env
- Docker Compose
- NGINX
- web shell
- API shell
- worker shell
- PostgreSQL
- Redis
- migrations
- CI
- tests
- docs

## Phase 1 — Question system

Deliver:
- Question/Answer schema
- QuestionProvider interface
- OpenTDB adapter
- ingestion command/job
- normalization
- deduplication
- provenance/licensing
- question pool queries

## Phase 2 — Quiz engine

Deliver:
- quiz session
- session questions
- answer submission
- server-side correctness
- score
- XP
- streaks
- result response

## Phase 3 — Simple quiz UI

Deliver:
- category selection
- question page
- four answer buttons
- feedback
- results

This is the baseline before game mechanics.

## Phase 4 — Lane Rush

Deliver:
- Phaser scene
- four lanes
- car movement
- keyboard/mobile controls
- lane selection
- answer lock
- server result
- animations

## Phase 5 — Balloon Pop

Deliver:
- Phaser scene
- four balloons
- input
- pop animation
- answer lock
- server result

## Phase 6 — Gamification

Deliver:
- XP
- levels
- streaks
- achievements
- user stats
- leaderboard

## Phase 7 — Production hardening

Deliver:
- structured logging
- request IDs
- rate limiting
- health/readiness
- Redis caching
- worker retries
- backups
- security review

## Phase 8 — AWS

Learn and document:
- IAM
- VPC/security groups
- EC2
- ECR
- RDS
- S3
- CloudWatch
- Route 53 / DNS where useful
- ALB where useful

Deploy a minimal staging environment first.

## Phase 9 — Kubernetes

Learn locally first:
- Pods
- Deployments
- Services
- ConfigMaps
- Secrets
- Ingress
- readiness/liveness probes
- rolling deployments
- horizontal scaling

Only then consider managed Kubernetes.
