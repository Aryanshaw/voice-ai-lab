"""LLM Models router — GET /api/llm-models/ with Redis caching."""

import json
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.cache import RedisManager
from core.deps import get_db_session, get_redis
from .crud import LLMModelCRUD
from .models import LLMModelResponse

router = APIRouter(prefix="/api/llm-models", tags=["llm-models"])

_CACHE_KEY = "llm_models:all"
_CACHE_TTL = 3600


@router.get("/", response_model=dict[str, list[LLMModelResponse]])
async def list_llm_models(
    db: AsyncSession = Depends(get_db_session),
    redis: RedisManager = Depends(get_redis),
):
    cached = await redis.get_json(_CACHE_KEY)
    if cached is not None:
        return cached

    crud = LLMModelCRUD(db)
    models = await crud.list_active()

    grouped: dict[str, list[dict]] = defaultdict(list)
    for m in models:
        grouped[m.provider].append(LLMModelResponse.model_validate(m).model_dump())

    result = dict(grouped)
    await redis.set_json(_CACHE_KEY, result, ttl=_CACHE_TTL)
    return result
