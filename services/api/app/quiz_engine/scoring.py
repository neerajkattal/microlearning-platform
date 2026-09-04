from datetime import date, timedelta
from typing import Optional

# Server-authoritative XP formula (CLAUDE.md "Scoring"). Deliberately
# simple constants, not economy-tuned — CLAUDE.md explicitly says not to
# tune this prematurely. Change these, not the shape of calculate_xp.
BASE_CORRECT_XP = 10
ATTEMPT_XP = 2  # awarded even for a wrong answer, for trying
DIFFICULTY_MULTIPLIER = {"easy": 1.0, "medium": 1.5, "hard": 2.0}
SPEED_BONUS_THRESHOLD_MS = 5000
SPEED_BONUS_XP = 5
MAX_STREAK_BONUS_DAYS = 10
STREAK_BONUS_XP_PER_DAY = 1
XP_PER_LEVEL = 100


def calculate_xp(
    *,
    is_correct: bool,
    difficulty: str,
    response_time_ms: Optional[int],
    current_streak: int,
) -> int:
    if not is_correct:
        return ATTEMPT_XP

    xp = BASE_CORRECT_XP * DIFFICULTY_MULTIPLIER.get(difficulty, 1.0)
    if response_time_ms is not None and response_time_ms <= SPEED_BONUS_THRESHOLD_MS:
        xp += SPEED_BONUS_XP
    xp += min(current_streak, MAX_STREAK_BONUS_DAYS) * STREAK_BONUS_XP_PER_DAY
    return round(xp)


def calculate_level(total_xp: int) -> int:
    return 1 + total_xp // XP_PER_LEVEL


def apply_daily_activity(stats, today: date) -> int:
    """Update stats.current_streak/longest_streak/last_activity_date for
    activity happening on `today`. Idempotent within the same day, so
    completing multiple quiz sessions in one day doesn't inflate the
    streak beyond +1."""
    if stats.last_activity_date == today:
        return stats.current_streak
    if stats.last_activity_date == today - timedelta(days=1):
        stats.current_streak += 1
    else:
        stats.current_streak = 1
    stats.longest_streak = max(stats.longest_streak, stats.current_streak)
    stats.last_activity_date = today
    return stats.current_streak
