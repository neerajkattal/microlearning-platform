from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from ..database import Base


class AdminUser(Base):
    """Deliberately separate from `User` (the player table), not a role
    flag on it - there's exactly one operator for this app, logging into
    a completely different surface (the /admin dashboard) than players
    ever see. Mixing the two would mean every player-facing query that
    touches `users` has to remember to exclude admin rows."""

    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)


class ActivityLog(Base):
    """An append-only feed for the admin dashboard - who registered, who
    logged in, who finished a quiz, and when. `user_id` has no FK
    constraint on purpose: a log entry should survive even if the row it
    describes is later deleted, rather than cascading or blocking that
    deletion - an audit trail that disappears when the thing it's
    auditing does isn't much of an audit trail."""

    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True)
    event_type = Column(String, nullable=False)  # "user_registered" | "user_login" | "quiz_completed"
    user_id = Column(Integer, nullable=True)
    username = Column(String, nullable=True)  # denormalized: survives a later rename
    detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)


class GameConfig(Base):
    """A single row (id=1) of the scoring constants from quiz_engine/
    scoring.py, editable from the admin dashboard. Defaults match those
    constants exactly - see quiz_engine/scoring.DEFAULT_SCORING_CONFIG,
    which both this table's defaults and every existing caller
    (calculate_xp with no config passed) fall back to."""

    __tablename__ = "game_config"

    id = Column(Integer, primary_key=True)
    base_correct_xp = Column(Integer, nullable=False, default=10)
    attempt_xp = Column(Integer, nullable=False, default=2)
    difficulty_multiplier_easy = Column(Float, nullable=False, default=1.0)
    difficulty_multiplier_medium = Column(Float, nullable=False, default=1.5)
    difficulty_multiplier_hard = Column(Float, nullable=False, default=2.0)
    speed_bonus_threshold_ms = Column(Integer, nullable=False, default=5000)
    speed_bonus_xp = Column(Integer, nullable=False, default=5)
    max_streak_bonus_days = Column(Integer, nullable=False, default=10)
    streak_bonus_xp_per_day = Column(Integer, nullable=False, default=1)
    xp_per_level = Column(Integer, nullable=False, default=100)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
