"""LLMModel CRUD."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import LLMModel


class LLMModelCRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_active(self) -> list[LLMModel]:
        result = await self.db.execute(
            select(LLMModel).where(LLMModel.is_active == True).order_by(LLMModel.provider, LLMModel.label)  # noqa: E712
        )
        return list(result.scalars().all())
