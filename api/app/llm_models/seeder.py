"""Seed llm_models table with default models if empty."""

from sqlalchemy import func, select

from config.db import Database
from config.logger import get_logger
from .models import LLMModel

logger = get_logger(__name__)

DEFAULT_MODELS = [
    {"provider": "anthropic", "model_id": "claude-haiku-4-5-20251001", "label": "Claude Haiku 4.5"},
    {"provider": "anthropic", "model_id": "claude-opus-4-5", "label": "Claude Opus 4.5"},
    {"provider": "anthropic", "model_id": "claude-opus-4-7", "label": "Claude Opus 4.7"},
    {"provider": "anthropic", "model_id": "claude-sonnet-4-5", "label": "Claude Sonnet 4.5"},
    {"provider": "anthropic", "model_id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6"},
    {"provider": "groq", "model_id": "gemma2-9b-it", "label": "Gemma 2 9B"},
    {"provider": "groq", "model_id": "llama-3.1-8b-instant", "label": "Llama 3.1 8B Instant"},
    {"provider": "groq", "model_id": "llama-3.3-70b-versatile", "label": "Llama 3.3 70B"},
    {"provider": "groq", "model_id": "meta-llama/llama-4-scout-17b-16e-instruct", "label": "Llama 4 Scout 17B"},
    {"provider": "groq", "model_id": "mixtral-8x7b-32768", "label": "Mixtral 8x7B"},
    {"provider": "groq", "model_id": "qwen/qwen3-32b", "label": "Qwen3 32B"},
    {"provider": "openai", "model_id": "gpt-4o", "label": "GPT 4o"},
    {"provider": "openai", "model_id": "gpt-4o-mini", "label": "GPT 4o Mini"},
    {"provider": "openai", "model_id": "gpt-5", "label": "GPT 5"},
    {"provider": "openai", "model_id": "gpt-5-mini", "label": "GPT 5 Mini"},
    {"provider": "openai", "model_id": "gpt-5.1", "label": "GPT 5.1"},
    {"provider": "openai", "model_id": "gpt-5.2", "label": "GPT 5.2"},
    {"provider": "openai", "model_id": "gpt-5.4", "label": "GPT 5.4"},
    {"provider": "openai", "model_id": "gpt-5.4-pro", "label": "GPT 5.4 Pro"},
    {"provider": "openai", "model_id": "o4-mini", "label": "o4 Mini"},
]


async def seed_if_empty(db: Database) -> None:
    async with db.session() as session:
        result = await session.execute(select(func.count()).select_from(LLMModel))
        if result.scalar() == 0:
            try:
                for m in DEFAULT_MODELS:
                    session.add(LLMModel(
                        is_active=True,
                        **m,
                    ))
                logger.info(f"Seeded {len(DEFAULT_MODELS)} LLM models.")
            except Exception as e:
                logger.exception(f"error in seed_if_empty: {e}")
                raise
