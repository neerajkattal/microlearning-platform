"""add password_hash to users

Revision ID: 4f0fa223e75c
Revises: d9d31e32c0ed
Create Date: 2026-09-08 12:50:54.719208

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f0fa223e75c'
down_revision: Union[str, None] = 'd9d31e32c0ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Two-step add: a NOT NULL column can't be added directly to a table
    # that already has rows (the pre-auth `test_user` seeded by earlier
    # phases) without a default for those existing rows to take. Add it
    # with a placeholder server_default, then drop the default so future
    # inserts must supply a real hash explicitly (matching the ORM model,
    # which has no default) instead of silently reusing the placeholder.
    op.add_column("users", sa.Column("password_hash", sa.String(), nullable=False, server_default=""))
    op.alter_column("users", "password_hash", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "password_hash")
