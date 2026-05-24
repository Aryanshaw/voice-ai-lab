"""Agent Config — ORM model and Pydantic schemas."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel, field_validator

from config.db import Base

if TYPE_CHECKING:
    from app.sessions.models import Session
    from app.metrics.models import Metric

# ── ORM ──────────────────────────────────────────────────────────────────────


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # short purpose summary
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False, default="groq/llama3-8b-8192")
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    voice_settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    sessions: Mapped[list["Session"]] = relationship(back_populates="config", cascade="all, delete-orphan")
    metrics: Mapped[list["Metric"]] = relationship(back_populates="config", cascade="all, delete-orphan")


# ── Schemas ──────────────────────────────────────────────────────────────────

class VoiceSettings(BaseModel):
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    model_id: str = "eleven_turbo_v2"
    stability: float = 0.5
    similarity_boost: float = 0.75


class ConfigCreate(BaseModel):
    name: str
    description: str | None = None
    system_prompt: str
    model: str = "groq/llama3-8b-8192"
    temperature: float = 0.7
    voice_settings: VoiceSettings = VoiceSettings()

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if not (0.0 <= v <= 2.0):
            raise ValueError("temperature must be between 0.0 and 2.0")
        return v


class ConfigUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    model: str | None = None
    temperature: float | None = None
    voice_settings: VoiceSettings | None = None

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float | None) -> float | None:
        if v is not None and not (0.0 <= v <= 2.0):
            raise ValueError("temperature must be between 0.0 and 2.0")
        return v


class ConfigResponse(BaseModel):
    id: str
    name: str
    description: str | None
    system_prompt: str
    model: str
    temperature: float
    voice_settings: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
