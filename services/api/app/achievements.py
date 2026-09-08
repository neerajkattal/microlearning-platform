from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from . import models


@dataclass(frozen=True)
class AchievementDefinition:
    code: str
    name: str
    description: str
    icon: Optional[str]


# The full catalog of achievements that can ever be earned. Adding a new
# one later means adding one entry here and one branch in `_qualifies` —
# nothing else needs to change, same "registry" shape as the worker's
# JOB_REGISTRY (services/worker/app/jobs/__init__.py).
ACHIEVEMENT_DEFINITIONS: list[AchievementDefinition] = [
    AchievementDefinition(
        "first_win", "First Win", "Answer at least one question correctly in a quiz session.", "🎯"
    ),
    AchievementDefinition(
        "perfect_score", "Perfect Score", "Get every question right in a session of 3 or more.", "💯"
    ),
    AchievementDefinition("streak_3", "3-Day Streak", "Play on 3 days in a row.", "🔥"),
    AchievementDefinition("streak_7", "Week Warrior", "Play on 7 days in a row.", "🗓️"),
    AchievementDefinition("level_5", "Rising Star", "Reach level 5.", "⭐"),
    AchievementDefinition("xp_100", "Century Club", "Earn 100 total XP.", "💰"),
]


def get_or_create_achievement(db: Session, definition: AchievementDefinition) -> models.Achievement:
    achievement = db.query(models.Achievement).filter_by(code=definition.code).first()
    if achievement:
        return achievement
    achievement = models.Achievement(
        code=definition.code,
        name=definition.name,
        description=definition.description,
        icon=definition.icon,
    )
    db.add(achievement)
    db.flush()
    return achievement


def _qualifies(code: str, *, score: int, total_questions: int, stats: models.UserStats) -> bool:
    if code == "first_win":
        return score > 0
    if code == "perfect_score":
        return total_questions >= 3 and score == total_questions
    if code == "streak_3":
        return stats.current_streak >= 3
    if code == "streak_7":
        return stats.current_streak >= 7
    if code == "level_5":
        return stats.level >= 5
    if code == "xp_100":
        return stats.xp >= 100
    return False


def check_and_award_achievements(
    db: Session, *, user: models.User, score: int, total_questions: int, stats: models.UserStats
) -> list[models.Achievement]:
    """Called once per completed session, after `stats` has already been
    updated for that session (xp/level/streak all reflect it). Returns
    only achievements newly earned just now — never re-returns one the
    user already had, and never awards the same one twice thanks to
    UserAchievement's (user_id, achievement_id) unique constraint."""
    already_earned_codes = {ua.achievement.code for ua in user.achievements}

    newly_earned = []
    for definition in ACHIEVEMENT_DEFINITIONS:
        if definition.code in already_earned_codes:
            continue
        if not _qualifies(definition.code, score=score, total_questions=total_questions, stats=stats):
            continue
        achievement = get_or_create_achievement(db, definition)
        db.add(models.UserAchievement(user_id=user.id, achievement_id=achievement.id))
        newly_earned.append(achievement)
        already_earned_codes.add(definition.code)

    return newly_earned
