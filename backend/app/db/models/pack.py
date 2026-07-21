from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base


class Pack(Base):
    __tablename__ = "packs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    character_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("characters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True, nullable=False)
    config_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    template_id: Mapped[str] = mapped_column(String(100), default="core-eight-v1", nullable=False)
    slots_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    character = relationship("Character", back_populates="packs")
    jobs = relationship("GenerationJob", back_populates="pack")
    export_manifests = relationship(
        "ExportManifest", back_populates="pack", cascade="all, delete-orphan"
    )
