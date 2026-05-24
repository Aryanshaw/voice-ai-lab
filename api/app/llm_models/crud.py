"""LLMModel CRUD."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.logger import get_logger
from .models import LLMModel

logger = get_logger(__name__)


class LLMModelCRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_active(self) -> list[LLMModel]:
        try:
            result = await self.db.execute(
                select(LLMModel).where(LLMModel.is_active == True).order_by(LLMModel.provider, LLMModel.label)  # noqa: E712
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.exception(f"error in list_active: {e}")
            raise
