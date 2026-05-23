"""LLM Models handler — fetch from DB, group by provider, cache in Redis."""

from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession

from config.cache import RedisManager
from config.logger import get_logger
from .crud import LLMModelCRUD
from .models import LLMModelResponse

logger = get_logger(__name__)

_CACHE_KEY = "llm_models:all"
_CACHE_TTL = 3600


class LLMModelHandler:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_grouped(self) -> dict[str, list[dict]]:
        redis = RedisManager.get_instance()

        cached = await redis.get_json(_CACHE_KEY)
        if cached is not None:
            return cached

        models = await LLMModelCRUD(self.db).list_active()

        grouped: dict[str, list[dict]] = defaultdict(list)
        for m in models:
            grouped[m.provider].append(LLMModelResponse.model_validate(m).model_dump())

        result = dict(grouped)
        await redis.set_json(_CACHE_KEY, result, ttl=_CACHE_TTL)
        logger.info(f"Loaded {sum(len(v) for v in result.values())} LLM models from DB, cached")
        return result
