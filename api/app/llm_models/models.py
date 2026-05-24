"""LLMModel — ORM model and Pydantic schemas."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from config.db import Base

# ── ORM ──────────────────────────────────────────────────────────────────────


class LLMModel(Base):
    __tablename__ = "llm_models"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model_id: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


# ── Schemas ──────────────────────────────────────────────────────────────────

class LLMModelResponse(BaseModel):
    id: str
    provider: str
    model_id: str
    label: str
    is_active: bool

    model_config = {"from_attributes": True}
