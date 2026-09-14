"""brand connection API keys and API request audit trail

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3d4e5f6a1b2"
down_revision: Union[str, None] = "b2c3d4e5f6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "brand_connections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "brand_id",
            sa.Integer(),
            sa.ForeignKey("brands.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("key_prefix", sa.String(length=24), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("rotated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("key_hash", name="brand_connections_key_hash_key"),
    )
    op.create_index(
        "ix_brand_connections_brand_id", "brand_connections", ["brand_id"]
    )
    op.create_index(
        "ix_brand_connections_active",
        "brand_connections",
        ["brand_id", "revoked_at"],
    )

    op.add_column(
        "verification_logs",
        sa.Column(
            "connection_id",
            sa.Integer(),
            sa.ForeignKey("brand_connections.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_verification_logs_connection_id",
        "verification_logs",
        ["connection_id"],
    )

    op.create_table(
        "api_call_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "brand_id",
            sa.Integer(),
            sa.ForeignKey("brands.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "connection_id",
            sa.Integer(),
            sa.ForeignKey("brand_connections.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("method", sa.String(length=16), nullable=False),
        sa.Column("path", sa.Text(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("submitted_code", sa.String(), nullable=True),
        sa.Column("result", sa.String(length=32), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_index("ix_api_call_logs_brand_id", "api_call_logs", ["brand_id"])
    op.create_index(
        "ix_api_call_logs_connection_id", "api_call_logs", ["connection_id"]
    )
    op.create_index(
        "ix_api_call_logs_created_at", "api_call_logs", ["created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_api_call_logs_created_at", table_name="api_call_logs")
    op.drop_index("ix_api_call_logs_connection_id", table_name="api_call_logs")
    op.drop_index("ix_api_call_logs_brand_id", table_name="api_call_logs")
    op.drop_table("api_call_logs")
    op.drop_index(
        "ix_verification_logs_connection_id", table_name="verification_logs"
    )
    op.drop_column("verification_logs", "connection_id")
    op.drop_index("ix_brand_connections_active", table_name="brand_connections")
    op.drop_index("ix_brand_connections_brand_id", table_name="brand_connections")
    op.drop_table("brand_connections")