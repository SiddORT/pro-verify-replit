"""Shared SQLAlchemy engine, session factory, and declarative Base.

Both the FastAPI app (`backend.main`) and the Alembic environment
(`alembic/env.py`) import from this module so that the same connection
configuration is used for runtime requests and schema migrations.
"""
from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load variables from a local .env file when present. Safe no-op on hosts
# (Replit Secrets, systemd EnvironmentFile, docker --env-file, ...) that
# already inject the environment directly.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ModuleNotFoundError:
    pass


def _require_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    return url


DATABASE_URL = _require_database_url()

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, future=True
)


class Base(DeclarativeBase):
    """Declarative base class shared by every ORM model."""


def get_db():
    """FastAPI dependency: yields a SQLAlchemy session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
