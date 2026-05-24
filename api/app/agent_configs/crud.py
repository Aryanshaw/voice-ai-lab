"""Agent Config CRUD."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.logger import get_logger
from .models import AgentConfig, ConfigCreate, ConfigUpdate

logger = get_logger(__name__)


class AgentConfigCRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(self) -> list[AgentConfig]:
        try:
            result = await self.db.execute(select(AgentConfig).order_by(AgentConfig.created_at.desc()))
            return list(result.scalars().all())
        except Exception as e:
            logger.exception(f"error in list: {e}")
            raise

    async def get(self, id: str) -> AgentConfig | None:
        try:
            return await self.db.get(AgentConfig, id)
        except Exception as e:
            logger.exception(f"error in get: {e}")
            raise

    async def create(self, data: ConfigCreate) -> AgentConfig:
        try:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            config = AgentConfig(
                name=data.name,
                description=data.description,
                system_prompt=data.system_prompt,
                model=data.model,
                temperature=data.temperature,
                voice_settings=data.voice_settings.model_dump(),
                updated_at=now,
            )
            self.db.add(config)
            await self.db.flush()
            await self.db.refresh(config)
            return config
        except Exception as e:
            logger.exception(f"error in create: {e}")
            raise

    async def update(self, config: AgentConfig, data: ConfigUpdate) -> AgentConfig:
        try:
            if data.name is not None:
                config.name = data.name
            if data.description is not None:
                config.description = data.description
            if data.system_prompt is not None:
                config.system_prompt = data.system_prompt
            if data.model is not None:
                config.model = data.model
            if data.temperature is not None:
                config.temperature = data.temperature
            if data.voice_settings is not None:
                config.voice_settings = data.voice_settings.model_dump()
            config.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            await self.db.flush()
            await self.db.refresh(config)
            return config
        except Exception as e:
            logger.exception(f"error in update: {e}")
            raise

    async def delete(self, config: AgentConfig) -> None:
        try:
            await self.db.delete(config)
            await self.db.flush()
        except Exception as e:
            logger.exception(f"error in delete: {e}")
            raise
