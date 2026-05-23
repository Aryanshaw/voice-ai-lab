"""LLM Models router — GET /api/llm-models/"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_db_session
from .handler import LLMModelHandler
from .models import LLMModelResponse

router = APIRouter(prefix="/api/llm-models", tags=["llm-models"])


@router.get("/", response_model=dict[str, list[LLMModelResponse]])
async def list_llm_models(db: AsyncSession = Depends(get_db_session)):
    return await LLMModelHandler(db).list_grouped()
