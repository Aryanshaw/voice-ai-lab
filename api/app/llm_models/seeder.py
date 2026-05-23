"""Seed llm_models table with default models if empty."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select

from config.db import Database
from config.logger import get_logger
from .models import LLMModel

logger = get_logger(__name__)

DEFAULT_MODELS = [
    {"provider": "groq", "model_id": "llama3-8b-8192",         "label": "Llama 3 8B"},
    {"provider": "groq", "model_id": "llama3-70b-8192",         "label": "Llama 3 70B"},
    {"provider": "groq", "model_id": "mixtral-8x7b-32768",      "label": "Mixtral 8x7B"},
    {"provider": "groq", "model_id": "gemma2-9b-it",            "label": "Gemma 2 9B"},
    {"provider": "groq", "model_id": "llama-3.1-8b-instant",    "label": "Llama 3.1 8B Instant"},
    {"provider": "groq", "model_id": "llama-3.1-70b-versatile", "label": "Llama 3.1 70B Versatile"},
]


async def seed_if_empty(db: Database) -> None:
    async with db.session() as session:
        result = await session.execute(select(func.count()).select_from(LLMModel))
        if result.scalar() == 0:
            for m in DEFAULT_MODELS:
                session.add(LLMModel(
                    id=str(uuid.uuid4()),
                    created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                    is_active=True,
                    **m,
                ))
            logger.info(f"Seeded {len(DEFAULT_MODELS)} LLM models.")
