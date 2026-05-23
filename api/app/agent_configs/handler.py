"""Agent Config handler — business logic layer."""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .crud import AgentConfigCRUD
from .models import AgentConfig, ConfigCreate, ConfigUpdate


class AgentConfigHandler:
    def __init__(self, db: AsyncSession) -> None:
        self.crud = AgentConfigCRUD(db)

    async def list_configs(self) -> list[AgentConfig]:
        return await self.crud.list()

    async def get_config(self, id: str) -> AgentConfig:
        config = await self.crud.get(id)
        if not config:
            raise HTTPException(status_code=404, detail="Config not found")
        return config

    async def create_config(self, data: ConfigCreate) -> AgentConfig:
        return await self.crud.create(data)

    async def update_config(self, id: str, data: ConfigUpdate) -> AgentConfig:
        config = await self.get_config(id)
        return await self.crud.update(config, data)

    async def delete_config(self, id: str) -> None:
        config = await self.get_config(id)
        await self.crud.delete(config)
