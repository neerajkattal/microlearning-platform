"""add topic_requests table

Revision ID: dca5a25b8164
Revises: 9b1c4e7a2d6f
Create Date: 2026-09-20 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dca5a25b8164'
down_revision: Union[str, None] = '9b1c4e7a2d6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "topic_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic", sa.String(), nullable=False),
        sa.Column("topic_normalized", sa.String(), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=True),
        sa.Column("requested_by_username", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_topic_requests_topic_normalized", "topic_requests", ["topic_normalized"])


def downgrade() -> None:
    op.drop_index("ix_topic_requests_topic_normalized", table_name="topic_requests")
    op.drop_table("topic_requests")
