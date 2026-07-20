from datetime import datetime, timezone
from typing import Optional

from backend.app.db.base import Base
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    character_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("characters.id", ondelete="SET NULL"), index=True, nullable=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("generation_jobs.id", ondelete="SET NULL"), index=True, nullable=True)
    asset_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # selfie | canonical | sticker | temp
    relative_path: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user = relationship("User", back_populates="assets")
    character = relationship("Character", back_populates="assets")
    job = relationship("GenerationJob", back_populates="assets")
