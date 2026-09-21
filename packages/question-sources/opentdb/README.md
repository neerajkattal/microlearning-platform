# packages/question-sources/opentdb — placeholder

Same reasoning as `packages/quiz-engine`: `ENGINEERING.md` places this under
`packages/`, but question ingestion (fetch → validate → normalize →
deduplicate → persist, with retries and rate-limit awareness — see
`docs/architecture/QUESTION_SYSTEM.md`) is a **backend/worker concern**,
not something the browser does.

**Deviation:** the real `QuestionProvider` interface and the OpenTDB
adapter live in `services/api/app/question_sources/`, and the actual
scheduled ingestion job runs in `services/worker`. Both added in Phase 0/1
— see `docs/BUILD_PLAN.md`.

This folder is reserved for any shared TypeScript types describing a
*normalized* question shape the frontend might want independently of
`shared-types` (unlikely, but kept for symmetry with the repo layout in
`ENGINEERING.md`). Nothing here yet.
