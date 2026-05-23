"""Session — ORM model and Pydantic schemas."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel

from config.db import Base

if TYPE_CHECKING:
    from app.agent_configs.models import AgentConfig
    from app.session_turns.models import SessionTurn
    from app.metrics.models import Metric

# ── ORM ──────────────────────────────────────────────────────────────────────


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    config_id: Mapped[str] = mapped_column(
        String, ForeignKey("agent_configs.id", ondelete="CASCADE"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    config: Mapped["AgentConfig"] = relationship(back_populates="sessions")
    turns: Mapped[list["SessionTurn"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    metrics: Mapped[list["Metric"]] = relationship(back_populates="session", cascade="all, delete-orphan")


# ── Schemas ──────────────────────────────────────────────────────────────────

class SessionResponse(BaseModel):
    id: str
    config_id: str
    started_at: datetime
    ended_at: datetime | None
    status: str

    model_config = {"from_attributes": True}
