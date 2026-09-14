#!/usr/bin/env bash
set -euo pipefail

# Restore the locked Python and frontend dependencies after an isolated task merge.
uv sync --frozen
npm --prefix frontend ci --no-audit --no-fund

# Keep the development database aligned with the merged backend schema.
uv run alembic upgrade head