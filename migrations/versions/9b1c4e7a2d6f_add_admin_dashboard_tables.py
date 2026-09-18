"""add admin dashboard tables (admin_users, activity_log, game_config) and
last_login_at / is_active columns

Revision ID: 9b1c4e7a2d6f
Revises: 5fda6aad6b4a
Create Date: 2026-09-19 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b1c4e7a2d6f'
down_revision: Union[str, None] = '5fda6aad6b4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("username", name="uq_admin_users_username"),
    )

    op.create_table(
        "activity_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("detail", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_activity_log_created_at", "activity_log", ["created_at"])

    op.create_table(
        "game_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("base_correct_xp", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("attempt_xp", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("difficulty_multiplier_easy", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("difficulty_multiplier_medium", sa.Float(), nullable=False, server_default="1.5"),
        sa.Column("difficulty_multiplier_hard", sa.Float(), nullable=False, server_default="2.0"),
        sa.Column("speed_bonus_threshold_ms", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("speed_bonus_xp", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("max_streak_bonus_days", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("streak_bonus_xp_per_day", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("xp_per_level", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.add_column("users", sa.Column("last_login_at", sa.DateTime(), nullable=True))
    op.add_column("categories", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("questions", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("questions", "is_active")
    op.drop_column("categories", "is_active")
    op.drop_column("users", "last_login_at")
    op.drop_table("game_config")
    op.drop_index("ix_activity_log_created_at", table_name="activity_log")
    op.drop_table("activity_log")
    op.drop_table("admin_users")
