# Question System

## Principle

The application owns the normalized question model. External providers are adapters.

## Internal model

```text
Question
- id
- text
- category
- difficulty
- explanation
- source
- sourceQuestionId
- license
- createdAt
- updatedAt

Answer
- id
- questionId
- text
- isCorrect
```

`isCorrect` is server-only and must never be returned to the browser.

## Ingestion

```text
Provider
→ fetch batch
→ validate
→ decode/normalize
→ map category/difficulty
→ identify correct answer
→ deduplicate
→ persist
```

The ingestion process must be safe to run multiple times.

## OpenTDB

Use OpenTDB for initial seed content. Do not couple the quiz engine to OpenTDB's response shape.

Store source and license metadata for attribution/provenance.

Do not call OpenTDB for every player question.

## Answer randomization

Store answers in any deterministic database order, but shuffle presentation per quiz/session/question. The position shown to a player is not part of the permanent content model.

## Quality

Track, at minimum:
- presentation count
- answer count
- correct count
- average response time

This enables future question-quality review and adaptive learning.
