"""SessionTurn — ORM model and Pydantic schemas."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel

from config.db import Base

if TYPE_CHECKING:
    from app.sessions.models import Session

# ── ORM ──────────────────────────────────────────────────────────────────────


class SessionTurn(Base):
    __tablename__ = "session_turns"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    stt_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    llm_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tts_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    session: Mapped["Session"] = relationship(back_populates="turns")


# ── Schemas ──────────────────────────────────────────────────────────────────

class TurnResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    stt_ms: int | None
    llm_ms: int | None
    tts_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
