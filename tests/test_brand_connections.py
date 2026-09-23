"""Focused tests for the brand connection API.

These tests intentionally use small database doubles instead of requiring a
running PostgreSQL service.  The production code still exercises SQLAlchemy
Core and the migration is checked separately by the normal Alembic command.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import os
import secrets
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.sql.elements import TextClause

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SESSION_SECRET", "brand-connection-test-secret")

from backend import main  # noqa: E402


class Result:
    def __init__(self, first=None, rows=None, scalar=0):
        self._first = first
        self._rows = rows if rows is not None else ([] if first is None else [first])
        self._scalar = scalar

    def first(self):
        return self._first

    def all(self):
        return self._rows

    def scalar(self):
        return self._scalar


class AuthDB:
    def __init__(self, rows):
        self.rows = rows
        self.params = []

    def execute(self, query, params=None):
        self.params.append(params or {})
        # Simulate the database's slug predicate, which also verifies that a
        # valid key from another brand cannot authenticate this request.
        slug = (params or {}).get("s")
        rows = [row for row in self.rows if row[6] == slug]
        return Result(rows=rows)


class ConnectionDB:
    def __init__(self, row):
        self.row = row
        self.statements = []
        self.commits = 0

    def execute(self, query, params=None):
        sql = str(query)
        self.statements.append((sql, params or {}))
        if "SELECT 1 FROM brands" in sql:
            return Result(first=(self.row[1],))
        if "RETURNING id" in sql:
            return Result(first=(self.row[0],))
        if "SELECT c.id" in sql:
            return Result(first=self.row)
        if "SET revoked_at" in sql:
            self.row = self.row[:5] + (dt.datetime.utcnow(),) + self.row[6:]
        return Result()

    def commit(self):
        self.commits += 1


class LogDB:
    def __init__(self, rows):
        self.rows = rows
        self.statements = []

    def execute(self, query, params=None):
        self.statements.append((str(query), params or {}))
        if "COUNT(*)" in str(query):
            return Result(scalar=len(self.rows))
        return Result(rows=self.rows)


class RecordDB:
    def __init__(self):
        self.statements = []

    def execute(self, query, params=None):
        self.statements.append((query, params or {}))
        return Result()


def connection_row(connection_id=4, revoked_at=None):
    now = dt.datetime(2025, 1, 2, 3, 4, 5)
    return (
        connection_id,
        7,
        "Acme",
        "Production",
        "pvk_12345678",
        revoked_at,
        None,
        now,
        now,
        None,
    )


class BrandConnectionTests(unittest.TestCase):
    def test_multiple_keys_and_brand_isolation(self):
        key_a = "pvk-a"
        key_b = "pvk-b"
        row_a = (1, 7, hashlib.sha256(key_a.encode()).hexdigest(), 7, "Acme", "pvk-a", "acme")
        row_b = (2, 8, hashlib.sha256(key_b.encode()).hexdigest(), 8, "Other", "pvk-b", "other")
        db = AuthDB([row_a, row_b])

        authenticated = main._authenticate_brand_connection("acme", key_a, db)
        self.assertEqual(authenticated["id"], 1)
        self.assertIsNone(main._authenticate_brand_connection("acme", key_b, db))
        self.assertEqual(
            main._authenticate_brand_connection("other", key_b, db)["id"], 2
        )

    def test_create_discloses_secret_once_and_rotation_changes_digest(self):
        db = ConnectionDB(connection_row())
        created = main.create_brand_connection(
            7, main.ConnectionIn(name=" Production "), db, admin={"id": 1}
        )
        self.assertTrue(created["api_key"].startswith("pvk_"))
        self.assertEqual(created["key"], created["api_key"])
        self.assertNotIn("key_hash", created)
        self.assertEqual(created["name"], "Production")

        rotated = main._rotate_connection(7, 4, db)
        self.assertTrue(rotated["api_key"].startswith("pvk_"))
        update_params = [
            params
            for sql, params in db.statements
            if "UPDATE brand_connections" in sql
        ][-1]
        self.assertEqual(
            update_params["h"],
            hashlib.sha256(rotated["api_key"].encode()).hexdigest(),
        )
        self.assertNotEqual(created["api_key"], rotated["api_key"])

    def test_revoke_is_idempotent_and_blocks_rotation(self):
        db = ConnectionDB(connection_row())
        revoked = main._revoke_connection(7, 4, db)
        self.assertFalse(revoked["is_active"])
        revoked_again = main._revoke_connection(7, 4, db)
        self.assertFalse(revoked_again["is_active"])
        with self.assertRaises(main.HTTPException):
            main._rotate_connection(7, 4, db)

    def test_log_filters_and_audit_fields(self):
        created = dt.datetime(2025, 1, 2, 3, 4, 5)
        row = (
            10, 7, "Acme", 4, "Production", "POST",
            "/api/v1/brands/acme/verify", 200, "CODE-123", "first",
             "pvk_12345678", "127.0.0.1", "test-agent", {"code": "CODE-123"}, created,
        )
        db = LogDB([row])
        result = main._list_api_call_logs(
            db,
            brand_id=7,
            connection=4,
            code="123",
            code_exact=False,
            result="first",
            date_from="2025-01-01",
            date_to="2025-01-03",
            limit=10,
            offset=0,
        )
        item = result["items"][0]
        self.assertEqual(item["connection_key_prefix"], "pvk_12345678")
        self.assertEqual(item["submitted_code"], "CODE-123")
        self.assertEqual(item["result"], "first")
        query = db.statements[-1][0]
        self.assertIn("l.submitted_code ILIKE", query)
        self.assertIn("l.result", query)
        self.assertIn("date_from", query)
        self.assertIn("date_to", query)

        exact_db = LogDB([row])
        main._list_api_call_logs(exact_db, code="CODE-123", code_exact=True)
        self.assertIn("l.submitted_code=:submitted_code", exact_db.statements[-1][0])

    def test_api_call_record_uses_sqlalchemy_statements_and_defers_commit(self):
        db = RecordDB()
        request = main.Request(
            {
                "type": "http",
                "method": "POST",
                "path": "/api/v1/brands/acme/verify",
                "headers": [(b"user-agent", b"test-agent")],
                "client": ("127.0.0.1", 5000),
            }
        )
        main._record_api_call(
            db,
            {"id": 4, "brand_id": 7, "key_prefix": "pvk_12345678"},
            request,
            200,
            {"code": "CODE-123", "result": "first"},
        )
        self.assertEqual(len(db.statements), 2)
        self.assertTrue(all(isinstance(query, TextClause) for query, _ in db.statements))
        self.assertEqual(db.statements[0][1]["key_prefix"], "pvk_12345678")

    def test_public_verification_helper_retains_invalid_semantics(self):
        class VerifyDB:
            def __init__(self):
                self.inserted = None

            def execute(self, query, params=None):
                sql = str(query)
                if "FROM product_codes" in sql:
                    return Result(first=None)
                if "INSERT INTO verification_logs" in sql:
                    self.inserted = params
                return Result()

            def commit(self):
                pass

        request = main.Request(
            {
                "type": "http",
                "method": "POST",
                "path": "/api/public/verify",
                "headers": [],
                "client": ("127.0.0.1", 5000),
            }
        )
        result = main._verify_brand_code(
            "UNKNOWN", (7, "Acme"), request, VerifyDB()
        )
        self.assertEqual(result, {"status": "invalid", "brand": "Acme"})

    def test_api_body_rejects_slug_and_other_fields(self):
        with self.assertRaises(Exception):
            main.APIVerifyIn(code="ABC", slug="acme")


@unittest.skipUnless(
    main.engine.dialect.name == "postgresql",
    "PostgreSQL-backed route tests require DATABASE_URL",
)
class BrandConnectionRouteTests(unittest.TestCase):
    def setUp(self):
        self.db = main.SessionLocal()
        suffix = secrets.token_hex(6)
        self.slug = f"route-test-{suffix}"
        self.other_slug = f"route-other-{suffix}"
        self.brand_id = self.db.execute(
            text(
                "INSERT INTO brands(name,slug,is_active) "
                "VALUES('Route Test',:slug,TRUE) RETURNING id"
            ),
            {"slug": self.slug},
        ).scalar_one()
        self.other_brand_id = self.db.execute(
            text(
                "INSERT INTO brands(name,slug,is_active) "
                "VALUES('Route Other',:slug,TRUE) RETURNING id"
            ),
            {"slug": self.other_slug},
        ).scalar_one()
        batch_id = self.db.execute(
            text(
                "INSERT INTO upload_batches"
                "(brand_id,batch_number,file_name,codes_uploaded) "
                "VALUES(:brand_id,:batch,'test.xlsx',1) RETURNING id"
            ),
            {"brand_id": self.brand_id, "batch": f"ROUTE-{suffix}"},
        ).scalar_one()
        self.code_id = self.db.execute(
            text(
                "INSERT INTO product_codes(code,brand_id,batch_id) "
                "VALUES('ROUTE-CODE',:brand_id,:batch_id) RETURNING id"
            ),
            {"brand_id": self.brand_id, "batch_id": batch_id},
        ).scalar_one()
        self.db.commit()
        main.app.dependency_overrides[main.current_admin] = lambda: {
            "id": 1,
            "email": "test@example.invalid",
        }
        self.client = TestClient(main.app)
        main._rate_buckets.clear()

    def tearDown(self):
        main.app.dependency_overrides.pop(main.current_admin, None)
        self.db.rollback()
        for brand_id in (self.brand_id, self.other_brand_id):
            self.db.execute(
                text("DELETE FROM brands WHERE id=:id"), {"id": brand_id}
            )
        self.db.commit()
        self.db.close()

    def test_full_request_lifecycle_and_persisted_attribution(self):
        created = self.client.post(
            f"/api/brands/{self.brand_id}/connections",
            json={"name": "Route connection"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        connection_id = created.json()["id"]
        first_key = created.json()["api_key"]
        headers = {"X-API-Key": first_key, "User-Agent": "route-test-agent"}

        listed = self.client.get(f"/api/brands/{self.brand_id}/connections")
        self.assertNotIn("api_key", listed.text)
        self.assertNotIn(first_key, listed.text)

        outcomes = [
            self.client.post(
                f"/api/v1/brands/{self.slug}/verify",
                headers=headers,
                json={"code": "ROUTE-CODE"},
            ),
            self.client.post(
                f"/api/v1/brands/{self.slug}/verify",
                headers=headers,
                json={"code": "ROUTE-CODE"},
            ),
            self.client.post(
                f"/api/v1/brands/{self.slug}/verify",
                headers=headers,
                json={"code": "UNKNOWN"},
            ),
        ]
        self.assertEqual(
            [(r.status_code, r.json()["status"]) for r in outcomes],
            [(200, "first"), (200, "repeat"), (200, "invalid")],
        )
        malformed = self.client.post(
            f"/api/v1/brands/{self.slug}/verify",
            headers=headers,
            json={"code": "ROUTE-CODE", "extra": True},
        )
        self.assertEqual(malformed.status_code, 422)
        self.assertEqual(
            self.client.post(
                f"/api/v1/brands/{self.other_slug}/verify",
                headers=headers,
                json={"code": "ROUTE-CODE"},
            ).status_code,
            401,
        )

        rotated = self.client.post(
            f"/api/brands/{self.brand_id}/connections/{connection_id}/rotate"
        )
        second_key = rotated.json()["api_key"]
        self.assertEqual(
            self.client.post(
                f"/api/v1/brands/{self.slug}/verify",
                headers=headers,
                json={"code": "ROUTE-CODE"},
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/brands/{self.slug}/verify",
                headers={"X-API-Key": second_key},
                json={"code": "ROUTE-CODE"},
            ).status_code,
            200,
        )
        self.client.post(
            f"/api/brands/{self.brand_id}/connections/{connection_id}/revoke"
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/brands/{self.slug}/verify",
                headers={"X-API-Key": second_key},
                json={"code": "ROUTE-CODE"},
            ).status_code,
            401,
        )

        self.db.expire_all()
        audit = self.db.execute(
            text(
                "SELECT result,status_code,connection_id,key_prefix "
                "FROM api_call_logs WHERE connection_id=:connection_id "
                "ORDER BY id"
            ),
            {"connection_id": connection_id},
        ).all()
        self.assertEqual(
            [(row[0], row[1]) for row in audit[:4]],
            [("first", 200), ("repeat", 200), ("invalid", 200), ("error", 422)],
        )
        self.assertTrue(all(row[2] == connection_id and row[3] for row in audit))

        public = self.client.post(
            "/api/public/verify",
            json={"slug": self.slug, "code": "ROUTE-CODE"},
        )
        self.assertEqual(public.status_code, 200, public.text)
        self.assertEqual(public.json()["status"], "repeat")

        batch_logs = self.client.get(f"/api/codes/{self.code_id}/logs")
        self.assertEqual(batch_logs.status_code, 200, batch_logs.text)
        self.assertEqual(batch_logs.json()["total"], 4)
        sources = batch_logs.json()["items"]
        self.assertEqual(
            [row["source"] for row in sources].count("connection"), 3
        )
        self.assertEqual([row["source"] for row in sources].count("public"), 1)
        self.assertTrue(
            all(row["connection_name"] == "Route connection"
                for row in sources if row["source"] == "connection")
        )
        self.assertEqual(
            self.client.get(
                f"/api/brands/{self.brand_id}/connections/{connection_id}/logs"
            ).json()["total"],
            len(audit),
        )
        now_utc = dt.datetime.utcnow()
        for row in sources:
            created = dt.datetime.fromisoformat(row["created_at"])
            self.assertLess(abs((now_utc - created).total_seconds()), 60)

        activity = self.client.get(
            "/api/activity", params={"brand_id": self.brand_id}
        )
        self.assertEqual(activity.status_code, 200)
        self.assertEqual(
            {row["source"] for row in activity.json()},
            {"connection", "public"},
        )


if __name__ == "__main__":
    unittest.main()