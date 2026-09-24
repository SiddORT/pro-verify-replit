---
name: VPS timestamp convention
description: Production timezone assumption for database timestamps and API responses.
---

The user's VPS, Python, and PostgreSQL are configured for Asia/Kolkata. Timestamp-without-timezone database values written by PostgreSQL defaults are IST wall-clock values, not UTC. Attach Asia/Kolkata to naive values when serializing API responses; do not reinterpret them as UTC, change the VPS/database timezone, or blindly rewrite historical rows.

**Why:** Timezone-less ISO strings were treated as UTC by the frontend, shifting displayed IST times by +5:30. A previous attempt to force UTC on individual log inserts could mix timestamp conventions if deployed; establish the provenance of any such rows before correcting history.

**How to apply:** For new timestamp paths, make the time basis explicit from database write through API response and client parsing. Preserve the existing IST server convention unless the user intentionally plans a migration.