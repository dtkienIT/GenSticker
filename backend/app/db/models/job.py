from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    character_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("characters.id", ondelete="CASCADE"), index=True, nullable=True)
    pack_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("packs.id", ondelete="CASCADE"), index=True, nullable=True)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)  # canonical_generation | expression_generation | pack_generation
    status: Mapped[str] = mapped_column(String(50), default="queued", index=True, nullable=False)  # queued | running | succeeded | failed | cancelled
    current_stage: Mapped[str] = mapped_column(String(50), default="validating", nullable=False)  # validating | preparing | generating | background_removal | postprocessing | exporting | completed
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    provider: Mapped[str] = mapped_column(String(50), default="mock", nullable=False)
    request_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="jobs")
    character = relationship("Character", back_populates="jobs")
    pack = relationship("Pack", back_populates="jobs")
    assets = relationship("Asset", back_populates="job")
    events = relationship("JobEvent", back_populates="job", cascade="all, delete-orphan")
    cost_ledgers = relationship("CostLedger", back_populates="job")


class JobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("generation_jobs.id", ondelete="CASCADE"), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    job = relationship("GenerationJob", back_populates="events")
