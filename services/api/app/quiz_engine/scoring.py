from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from .. import models

# Server-authoritative XP formula (CLAUDE.md "Scoring"). Deliberately
# simple constants, not economy-tuned — CLAUDE.md explicitly says not to
# tune this prematurely. These remain the defaults for every caller that
# doesn't pass a `config` - live-tuning via the admin dashboard (see
# GameConfig, get_active_scoring_config below) is opt-in on top of them,
# not a replacement for having sane defaults.
BASE_CORRECT_XP = 10
ATTEMPT_XP = 2  # awarded even for a wrong answer, for trying
DIFFICULTY_MULTIPLIER = {"easy": 1.0, "medium": 1.5, "hard": 2.0}
SPEED_BONUS_THRESHOLD_MS = 5000
SPEED_BONUS_XP = 5
MAX_STREAK_BONUS_DAYS = 10
STREAK_BONUS_XP_PER_DAY = 1
XP_PER_LEVEL = 100


@dataclass(frozen=True)
class ScoringConfig:
    base_correct_xp: int = BASE_CORRECT_XP
    attempt_xp: int = ATTEMPT_XP
    difficulty_multiplier_easy: float = DIFFICULTY_MULTIPLIER["easy"]
    difficulty_multiplier_medium: float = DIFFICULTY_MULTIPLIER["medium"]
    difficulty_multiplier_hard: float = DIFFICULTY_MULTIPLIER["hard"]
    speed_bonus_threshold_ms: int = SPEED_BONUS_THRESHOLD_MS
    speed_bonus_xp: int = SPEED_BONUS_XP
    max_streak_bonus_days: int = MAX_STREAK_BONUS_DAYS
    streak_bonus_xp_per_day: int = STREAK_BONUS_XP_PER_DAY
    xp_per_level: int = XP_PER_LEVEL

    def difficulty_multiplier(self, difficulty: str) -> float:
        return {
            "easy": self.difficulty_multiplier_easy,
            "medium": self.difficulty_multiplier_medium,
            "hard": self.difficulty_multiplier_hard,
        }.get(difficulty, 1.0)


DEFAULT_SCORING_CONFIG = ScoringConfig()


def get_active_scoring_config(db: Session) -> ScoringConfig:
    """The live, admin-editable config if one has been saved (GameConfig
    is a single row, id=1 - see routers/admin.py), otherwise the
    hardcoded defaults above. Falling back rather than requiring a row
    to exist means every existing deployment keeps behaving exactly as
    before until an admin explicitly changes something."""
    row = db.get(models.GameConfig, 1)
    if row is None:
        return DEFAULT_SCORING_CONFIG
    return ScoringConfig(
        base_correct_xp=row.base_correct_xp,
        attempt_xp=row.attempt_xp,
        difficulty_multiplier_easy=row.difficulty_multiplier_easy,
        difficulty_multiplier_medium=row.difficulty_multiplier_medium,
        difficulty_multiplier_hard=row.difficulty_multiplier_hard,
        speed_bonus_threshold_ms=row.speed_bonus_threshold_ms,
        speed_bonus_xp=row.speed_bonus_xp,
        max_streak_bonus_days=row.max_streak_bonus_days,
        streak_bonus_xp_per_day=row.streak_bonus_xp_per_day,
        xp_per_level=row.xp_per_level,
    )


def calculate_xp(
    *,
    is_correct: bool,
    difficulty: str,
    response_time_ms: Optional[int],
    current_streak: int,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> int:
    if not is_correct:
        return config.attempt_xp

    xp = config.base_correct_xp * config.difficulty_multiplier(difficulty)
    if response_time_ms is not None and response_time_ms <= config.speed_bonus_threshold_ms:
        xp += config.speed_bonus_xp
    xp += min(current_streak, config.max_streak_bonus_days) * config.streak_bonus_xp_per_day
    return round(xp)


def calculate_level(total_xp: int, config: ScoringConfig = DEFAULT_SCORING_CONFIG) -> int:
    return 1 + total_xp // config.xp_per_level


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
