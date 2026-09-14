"""SQLAlchemy ORM models for PROverify.

These models describe the desired final schema (with foreign keys,
constraints, indexes, and timestamps). Alembic uses `Base.metadata` from
``backend.database`` as its autogenerate target, so any change here can be
captured with::

    alembic revision --autogenerate -m "describe change"
    alembic upgrade head

Notes:
    * Existing API code in ``backend.main`` issues raw SQL via SQLAlchemy
      Core; the ORM models are additive and do not change runtime behaviour.
    * All ``created_at`` / ``updated_at`` columns use the database's
      ``now()`` as a server-side default so the value is set regardless of
      whether the row is inserted through the ORM or raw SQL.
"""
from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now()
    )


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    primary_color: Mapped[Optional[str]] = mapped_column(
        String, server_default="#1b5e20"
    )
    desktop_image: Mapped[Optional[str]] = mapped_column(Text)
    mobile_image: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
    batches: Mapped[list["UploadBatch"]] = relationship(
        back_populates="brand", cascade="all, delete-orphan"
    )
    codes: Mapped[list["ProductCode"]] = relationship(
        back_populates="brand", cascade="all, delete-orphan"
    )
    connections: Mapped[list["BrandConnection"]] = relationship(
        back_populates="brand", cascade="all, delete-orphan"
    )


class UploadBatch(Base):
    __tablename__ = "upload_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brand_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    file_name: Mapped[Optional[str]] = mapped_column(String)
    codes_uploaded: Mapped[Optional[int]] = mapped_column(Integer, server_default="0")
    created_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now()
    )

    brand: Mapped["Brand"] = relationship(back_populates="batches")
    codes: Mapped[list["ProductCode"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )


class ProductCode(Base):
    __tablename__ = "product_codes"
    __table_args__ = (
        UniqueConstraint("brand_id", "code", name="product_codes_brand_code_unique"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False, index=True)
    brand_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    batch_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("upload_batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now()
    )

    brand: Mapped["Brand"] = relationship(back_populates="codes")
    batch: Mapped["UploadBatch"] = relationship(back_populates="codes")


class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False, index=True)
    brand_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("brands.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    connection_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("brand_connections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    is_valid: Mapped[Optional[bool]] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )

    brand: Mapped[Optional["Brand"]] = relationship()
    connection: Mapped[Optional["BrandConnection"]] = relationship()


class BrandConnection(Base):
    """A credential issued to a brand integration.

    Only the one-way hash is persisted.  The clear-text key is returned once
    from the create/rotate endpoints and cannot be recovered afterwards.
    """

    __tablename__ = "brand_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brand_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(24), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    revoked_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
    last_used_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
    created_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
    rotated_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)

    brand: Mapped["Brand"] = relationship(back_populates="connections")
    api_call_logs: Mapped[list["ApiCallLog"]] = relationship(
        back_populates="connection", cascade="all, delete-orphan"
    )


class ApiCallLog(Base):
    """Audit record for an authenticated brand API request."""

    __tablename__ = "api_call_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    brand_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("brands.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    connection_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("brand_connections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    method: Mapped[str] = mapped_column(String(16), nullable=False)
    path: Mapped[str] = mapped_column(Text, nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    submitted_code: Mapped[Optional[str]] = mapped_column(String)
    result: Mapped[Optional[str]] = mapped_column(String(32))
    key_prefix: Mapped[Optional[str]] = mapped_column(String(24))
    ip_address: Mapped[Optional[str]] = mapped_column(String)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    # ``metadata`` is a reserved SQLAlchemy declarative attribute, therefore
    # expose it as request_metadata while retaining the conventional DB name.
    request_metadata: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSON, nullable=True
    )
    created_at: Mapped[Optional[dt.datetime]] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )

    brand: Mapped[Optional["Brand"]] = relationship()
    connection: Mapped[Optional["BrandConnection"]] = relationship(
        back_populates="api_call_logs"
    )
