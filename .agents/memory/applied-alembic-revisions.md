---
name: Applied Alembic revisions
description: Project convention for correcting schema changes after a migration has run.
---

Treat every Alembic revision as immutable once it has been applied in any environment. Add a new corrective revision instead of changing the old revision.

**Why:** An edited migration can make fresh databases and already-migrated databases disagree. Corrective migrations should tolerate known draft-schema drift when practical, such as using PostgreSQL `IF NOT EXISTS` for an additive column.

**How to apply:** Before changing an existing revision, check the current database revision. If it has run, preserve it and create a new migration that moves both fresh and existing databases to the same final schema.