"""initial schema

Captures the baseline PROverify schema (admins, brands, upload_batches,
product_codes, verification_logs) as it exists today, WITHOUT foreign keys.
This matches the schema that was created by the original startup-time DDL,
so existing databases can be marked as already-applied with::

    alembic stamp a1b2c3d4e5f6

A follow-up migration (``b2c3d4e5f6a1_add_foreign_keys``) layers on the
proper FK relationships and a few additional indexes.

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-05-26 00:00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.UniqueConstraint("email", name="admins_email_key"),
    )

    op.create_table(
        "brands",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column(
            "primary_color",
            sa.String(),
            server_default=sa.text("'#1b5e20'"),
            nullable=True,
        ),
        sa.Column("desktop_image", sa.Text(), nullable=True),
        sa.Column("mobile_image", sa.Text(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.UniqueConstraint("slug", name="brands_slug_key"),
    )

    op.create_table(
        "upload_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("brand_id", sa.Integer(), nullable=False),
        sa.Column("batch_number", sa.String(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=True),
        sa.Column(
            "codes_uploaded",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.UniqueConstraint("batch_number", name="upload_batches_batch_number_key"),
    )

    op.create_table(
        "product_codes",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("brand_id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "brand_id", "code", name="product_codes_brand_code_unique"
        ),
    )
    op.create_index(
        "idx_product_codes_code", "product_codes", ["code"], unique=False
    )
    op.create_index(
        "idx_product_codes_brand", "product_codes", ["brand_id"], unique=False
    )
    op.create_index(
        "idx_product_codes_batch", "product_codes", ["batch_id"], unique=False
    )

    op.create_table(
        "verification_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("brand_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "is_valid",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("verification_logs")
    op.drop_index("idx_product_codes_batch", table_name="product_codes")
    op.drop_index("idx_product_codes_brand", table_name="product_codes")
    op.drop_index("idx_product_codes_code", table_name="product_codes")
    op.drop_table("product_codes")
    op.drop_table("upload_batches")
    op.drop_table("brands")
    op.drop_table("admins")
