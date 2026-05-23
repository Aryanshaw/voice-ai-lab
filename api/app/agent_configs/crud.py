"""Agent Config CRUD."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AgentConfig, ConfigCreate, ConfigUpdate


class AgentConfigCRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(self) -> list[AgentConfig]:
        result = await self.db.execute(select(AgentConfig).order_by(AgentConfig.created_at.desc()))
        return list(result.scalars().all())

    async def get(self, id: str) -> AgentConfig | None:
        return await self.db.get(AgentConfig, id)

    async def create(self, data: ConfigCreate) -> AgentConfig:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        config = AgentConfig(
            id=str(uuid.uuid4()),
            name=data.name,
            system_prompt=data.system_prompt,
            model=data.model,
            temperature=data.temperature,
            voice_settings=data.voice_settings.model_dump(),
            created_at=now,
            updated_at=now,
        )
        self.db.add(config)
        await self.db.flush()
        await self.db.refresh(config)
        return config

    async def update(self, config: AgentConfig, data: ConfigUpdate) -> AgentConfig:
        if data.name is not None:
            config.name = data.name
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

    async def delete(self, config: AgentConfig) -> None:
        await self.db.delete(config)
        await self.db.flush()
