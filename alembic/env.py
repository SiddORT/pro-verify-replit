"""Alembic environment.

Reads `DATABASE_URL` from the process environment (with `.env` support via
``python-dotenv``) and uses the same SQLAlchemy ``Base.metadata`` that the
FastAPI app uses, so autogenerate diffs the live database against the ORM
models in ``backend.models``.

Run migrations with::

    alembic upgrade head        # apply all pending migrations
    alembic downgrade -1        # roll back one revision
    alembic revision --autogenerate -m "describe change"
    alembic stamp head          # mark an existing DB as fully migrated
"""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make the project root importable so `from backend...` works regardless of
# where `alembic` is invoked from.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Load .env (if present) BEFORE importing backend modules so DATABASE_URL is
# available when `backend.database` is imported.
try:
    from dotenv import load_dotenv

    load_dotenv(_PROJECT_ROOT / ".env")
except ModuleNotFoundError:
    pass

# Import models so their tables are registered on Base.metadata. The wildcard
# import is intentional — it ensures every model is loaded for autogenerate.
from backend.database import Base  # noqa: E402
from backend import models  # noqa: E402,F401

config = context.config

# Inject the runtime DATABASE_URL into Alembic's config so engine_from_config
# uses the right connection string without us writing it to alembic.ini.
_db_url = os.environ.get("DATABASE_URL")
if not _db_url:
    raise RuntimeError("DATABASE_URL must be set to run Alembic migrations")
config.set_main_option("sqlalchemy.url", _db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emits SQL to stdout)."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (against a live database connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
