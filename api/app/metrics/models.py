"""Metric — ORM model and Pydantic schemas."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel

from config.db import Base

if TYPE_CHECKING:
    from app.agent_configs.models import AgentConfig
    from app.sessions.models import Session

# ── ORM ──────────────────────────────────────────────────────────────────────


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    config_id: Mapped[str] = mapped_column(
        String, ForeignKey("agent_configs.id", ondelete="CASCADE"), nullable=False
    )
    session_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True
    )
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    error: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    config: Mapped["AgentConfig"] = relationship(back_populates="metrics")
    session: Mapped["Session | None"] = relationship(back_populates="metrics")


# ── Schemas ──────────────────────────────────────────────────────────────────

class MetricResponse(BaseModel):
    id: str
    config_id: str
    session_id: str | None
    stage: str
    latency_ms: int
    error: bool
    created_at: datetime

    model_config = {"from_attributes": True}
