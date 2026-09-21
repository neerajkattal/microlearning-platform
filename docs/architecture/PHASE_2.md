# Phase 2 — Quiz Engine

What got built, matching `docs/BUILD_PLAN.md`'s Phase 2 list and ENGINEERING.md
§3's "Quiz boundary."

## System

```text
POST /quiz-sessions {category?, question_count}
  → quiz_engine.sessions.start_session
    - random question selection (optionally filtered by category)
    - per-question answer order shuffled and stored (QuizSessionQuestion.shown_answer_order)
    - response never includes is_correct

POST /quiz-sessions/{id}/questions/{session_question_id}/answer {selected_answer_id, response_time_ms?}
  → quiz_engine.sessions.submit_answer
    - looks up the real Answer.is_correct server-side
    - rejects: unknown session/question, already-answered, session not in_progress
    - quiz_engine.scoring.calculate_xp (base + difficulty multiplier + speed bonus + streak bonus)
    - persists AnswerAttempt; XP is returned but not yet applied to UserStats

POST /quiz-sessions/{id}/complete
  → quiz_engine.sessions.complete_session
    - sums XP across all answered questions in the session
    - applies it to UserStats.xp, recalculates level
    - quiz_engine.scoring.apply_daily_activity updates the daily streak
    - marks the session completed; unanswered questions get no credit
```

Single seeded test user (`get_or_create_test_user`), same no-auth pattern
as Phase 0/1 — see `docs/architecture/PHASE_0.md`.

## Why XP isn't applied until session completion

`submit_answer` computes and *returns* XP for immediate UI feedback, but
doesn't write it to `UserStats` yet. Only `complete_session` sums XP
across the whole session and applies it once. This means an abandoned
session (some questions answered, never completed) earns nothing —
deliberate: it avoids needing a separate "undo" path for
partially-played sessions, and keeps "your score" and "what you were
actually credited for" the same number. The per-answer and
session-completion calculations use the same `calculate_xp` function and
read `UserStats.current_streak` before it's updated by
`apply_daily_activity` (which only runs once, at completion), so the two
never disagree.

## What's real vs. skeleton

Real and tested, verified against the live stack with real ingested
OpenTDB content (played a full 3-question session end to end: 2 correct
at medium/hard difficulty with speed bonuses, 1 wrong, landed exactly the
expected 47 XP, streak 1, level 1 — all confirmed via `psql` against the
live `users`/`user_stats` tables, not just the API response):
- `quiz_engine/scoring.py`: XP formula (difficulty multiplier, speed
  bonus, streak bonus, capped), level thresholds, daily streak
  (increment/reset/idempotent-same-day) — 10 tests
- `quiz_engine/sessions.py`: session creation with random question
  selection + per-question answer shuffling, server-side answer
  validation, one-attempt-per-question enforcement, session completion
  aggregating score/XP/streak into `UserStats` — 12 tests
- `POST/GET /quiz-sessions`, answer submission, completion: full
  round-trip tested via `TestClient`, plus verifies the session-start
  response never includes `is_correct` — 6 tests

## Skeleton/placeholder (deliberately)

- No auth — same single seeded `test_user` as ingestion. A real user
  system is a later phase.
- Question selection is uniform random, no spaced-repetition, no
  avoiding recently-seen questions.
- `explanation` is always `null` for OpenTDB-sourced questions — OpenTDB
  doesn't provide one. The field exists on `Question` for future
  internally-authored content.
- `QuestionStatistics` (presentation/answer/correct counts,
  `docs/architecture/QUESTION_SYSTEM.md` "Quality") still isn't populated
  — quiz attempts now generate exactly the data needed for it, but wiring
  it up is deferred rather than bundled into this phase.
- No achievements yet, despite `Achievement`/`UserAchievement` existing
  in the schema since Phase 0.

## Recommended next task

Phase 3 (Simple quiz UI) — see `docs/BUILD_PLAN.md`: category selection,
question page, four answer buttons, feedback, results — the baseline
`apps/web` UI that calls this API, before any game mechanics (Lane
Rush/Balloon Pop, Phase 4/5) get built on top of it.
