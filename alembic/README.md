# Database migrations

This project uses [Alembic](https://alembic.sqlalchemy.org/) on top of
SQLAlchemy. Models live in `backend/models.py`; migrations live in
`alembic/versions/`.

## Prerequisites

`DATABASE_URL` must be set in the environment (Replit Secrets, a local
`.env`, or a systemd `EnvironmentFile` on a VPS). Alembic reads it through
`alembic/env.py`.

## Day-to-day commands

```bash
# Apply every pending migration
alembic upgrade head

# Roll back one revision
alembic downgrade -1

# Create a new migration after editing backend/models.py
alembic revision --autogenerate -m "add new column to brands"

# Show current revision applied to the database
alembic current

# Show full history
alembic history --verbose
```

## Bootstrapping an existing database

The dev and currently-deployed production databases were created by the
old startup-time DDL, **not** by Alembic. To bring them under Alembic's
control without re-creating tables:

```bash
# 1. Mark the baseline as already applied (no SQL is run)
alembic stamp a1b2c3d4e5f6

# 2. Apply the rest (adds foreign keys + indexes — safe and additive)
alembic upgrade head
```

After that, normal `alembic upgrade head` workflow applies.

## Fresh installs (Ubuntu VPS, Docker, etc.)

```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/proverify
export SESSION_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"

# Either install path works — `alembic` is now pinned in both manifests.
pip install -r backend/requirements.txt
# or:  uv sync

alembic upgrade head
uvicorn backend.main:app --host 0.0.0.0 --port 5000
```

> **Important.** `backend.main` no longer self-heals the schema at startup
> (the old `_ensure_schema_constraints` hook is gone). Every deploy MUST
> run `alembic upgrade head` before the API starts, otherwise newly-added
> columns or constraints will be missing at runtime.

### Systemd unit (Ubuntu VPS)

A typical unit runs `alembic upgrade head` as an `ExecStartPre=` so deploys
self-migrate before the API starts:

```ini
[Unit]
Description=PROverify API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=proverify
WorkingDirectory=/opt/proverify
EnvironmentFile=/etc/proverify.env
ExecStartPre=/opt/proverify/.venv/bin/alembic upgrade head
ExecStart=/opt/proverify/.venv/bin/uvicorn backend.main:app \
    --host 0.0.0.0 --port 5000 --workers 2
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

If the `ExecStartPre` migration step fails, systemd will refuse to start
the API — that's the intended fail-fast behaviour, and prevents serving
traffic against a stale schema.
