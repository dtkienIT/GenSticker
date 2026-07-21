from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    external_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), default="Local User", nullable=False)
    locale: Mapped[str] = mapped_column(String(16), default="vi", nullable=False)
    consent_version: Mapped[str] = mapped_column(String(32), default="1.0", nullable=False)
    consent_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_reuse_opt_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    characters = relationship("Character", back_populates="user", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("GenerationJob", back_populates="user", cascade="all, delete-orphan")
    cost_ledgers = relationship("CostLedger", back_populates="user", cascade="all, delete-orphan")
    export_manifests = relationship(
        "ExportManifest", back_populates="user", cascade="all, delete-orphan"
    )
