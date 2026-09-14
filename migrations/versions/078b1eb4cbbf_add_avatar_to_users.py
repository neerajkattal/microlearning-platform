"""add avatar to users

Revision ID: 078b1eb4cbbf
Revises: 4f0fa223e75c
Create Date: 2026-09-16 09:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '078b1eb4cbbf'
down_revision: Union[str, None] = '4f0fa223e75c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Unlike password_hash's placeholder default (dropped right after so
    # every future insert must supply a real one), "astronaut" is a
    # genuine permanent default - the ORM model declares the same one,
    # so this server_default stays rather than being dropped.
    op.add_column("users", sa.Column("avatar", sa.String(), nullable=False, server_default="astronaut"))


def downgrade() -> None:
    op.drop_column("users", "avatar")
