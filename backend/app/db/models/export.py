from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base


class ExportManifest(Base):
    __tablename__ = "export_manifests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    pack_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("packs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    formats_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    assets_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checksums_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    native_share_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = relationship("User", back_populates="export_manifests")
    pack = relationship("Pack", back_populates="export_manifests")
