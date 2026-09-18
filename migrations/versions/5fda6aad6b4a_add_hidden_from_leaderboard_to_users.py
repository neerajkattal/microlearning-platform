"""add hidden_from_leaderboard to users

Revision ID: 5fda6aad6b4a
Revises: 078b1eb4cbbf
Create Date: 2026-09-18 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5fda6aad6b4a'
down_revision: Union[str, None] = '078b1eb4cbbf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("hidden_from_leaderboard", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "hidden_from_leaderboard")
