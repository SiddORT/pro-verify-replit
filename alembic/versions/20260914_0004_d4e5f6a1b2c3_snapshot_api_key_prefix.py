"""snapshot the API key prefix used by each audited request

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a1b2c3"
down_revision: Union[str, None] = "c3d4e5f6a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS also accommodates development databases that briefly ran
    # an earlier draft of the preceding migration containing this column.
    op.execute(
        "ALTER TABLE api_call_logs "
        "ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(24)"
    )
    # Preserve the best available prefix for audit rows created before this
    # snapshot column existed.
    op.execute(
        """
        UPDATE api_call_logs AS logs
           SET key_prefix = connections.key_prefix
          FROM brand_connections AS connections
         WHERE logs.connection_id = connections.id
           AND logs.key_prefix IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("api_call_logs", "key_prefix")