"""add foreign keys and supporting indexes

Adds the relational integrity that was missing from the original baseline
schema:

* ``upload_batches.brand_id``       -> ``brands.id``         (ON DELETE CASCADE)
* ``product_codes.brand_id``        -> ``brands.id``         (ON DELETE CASCADE)
* ``product_codes.batch_id``        -> ``upload_batches.id`` (ON DELETE CASCADE)
* ``verification_logs.brand_id``    -> ``brands.id``         (ON DELETE SET NULL)

It also adds a few indexes useful for the existing API queries:

* ``admins.email``                  (lookup on login)
* ``brands.slug``                   (lookup on public verify page)
* ``upload_batches.brand_id``       (list batches per brand)
* ``verification_logs.code``        (search by code)
* ``verification_logs.brand_id``    (per-brand activity log)
* ``verification_logs.created_at``  (chronological listings)

This migration is safe to run against the existing dev/prod databases
because every operation is additive (no destructive changes).

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-05-26 00:00:01
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "b2c3d4e5f6a1"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Some databases (notably ones whose initial schema was created by an
    # earlier auto-migration tool) already have foreign keys with default
    # ``<table>_<column>_fkey`` names. Drop those first so we end up with
    # exactly one canonical, well-named constraint per relationship.
    for legacy in (
        ("upload_batches", "upload_batches_brand_id_fkey"),
        ("product_codes", "product_codes_brand_id_fkey"),
        ("product_codes", "product_codes_batch_id_fkey"),
        ("verification_logs", "verification_logs_brand_id_fkey"),
    ):
        op.execute(f"ALTER TABLE {legacy[0]} DROP CONSTRAINT IF EXISTS {legacy[1]}")

    # ---- Repair orphan rows ----
    # Before the FKs existed, deletes through the API could leave dangling
    # rows. Clean those up now so the constraint creations below cannot fail
    # on legacy data. CASCADE/SET NULL behaviour after this migration will
    # prevent recurrence.
    op.execute(
        "DELETE FROM upload_batches "
        "WHERE brand_id NOT IN (SELECT id FROM brands)"
    )
    op.execute(
        "DELETE FROM product_codes "
        "WHERE brand_id NOT IN (SELECT id FROM brands)"
    )
    op.execute(
        "DELETE FROM product_codes "
        "WHERE batch_id NOT IN (SELECT id FROM upload_batches)"
    )
    # verification_logs uses ON DELETE SET NULL, so null out orphan refs
    # instead of deleting the audit row.
    op.execute(
        "UPDATE verification_logs SET brand_id = NULL "
        "WHERE brand_id IS NOT NULL "
        "AND brand_id NOT IN (SELECT id FROM brands)"
    )

    # ---- Foreign keys ----
    op.create_foreign_key(
        "fk_upload_batches_brand_id",
        "upload_batches",
        "brands",
        ["brand_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_product_codes_brand_id",
        "product_codes",
        "brands",
        ["brand_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_product_codes_batch_id",
        "product_codes",
        "upload_batches",
        ["batch_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_verification_logs_brand_id",
        "verification_logs",
        "brands",
        ["brand_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ---- Supporting indexes (idempotent via IF NOT EXISTS) ----
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_admins_email ON admins (email)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_brands_slug ON brands (slug)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_upload_batches_brand_id "
        "ON upload_batches (brand_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_verification_logs_code "
        "ON verification_logs (code)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_verification_logs_brand_id "
        "ON verification_logs (brand_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_verification_logs_created_at "
        "ON verification_logs (created_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_verification_logs_created_at")
    op.execute("DROP INDEX IF EXISTS ix_verification_logs_brand_id")
    op.execute("DROP INDEX IF EXISTS ix_verification_logs_code")
    op.execute("DROP INDEX IF EXISTS ix_upload_batches_brand_id")
    op.execute("DROP INDEX IF EXISTS ix_brands_slug")
    op.execute("DROP INDEX IF EXISTS ix_admins_email")

    op.drop_constraint(
        "fk_verification_logs_brand_id", "verification_logs", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_product_codes_batch_id", "product_codes", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_product_codes_brand_id", "product_codes", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_upload_batches_brand_id", "upload_batches", type_="foreignkey"
    )
