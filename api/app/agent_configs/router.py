"""Agent Config router."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_db_session, get_readonly_session
from .handler import AgentConfigHandler
from .models import ConfigCreate, ConfigUpdate, ConfigResponse

router = APIRouter(prefix="/api/configs", tags=["agent-configs"])


async def get_handler(db: AsyncSession = Depends(get_db_session)) -> AgentConfigHandler:
    return AgentConfigHandler(db)


async def get_read_handler(db: AsyncSession = Depends(get_readonly_session)) -> AgentConfigHandler:
    return AgentConfigHandler(db)


@router.get("/", response_model=list[ConfigResponse])
async def list_configs(handler: AgentConfigHandler = Depends(get_read_handler)):
    return await handler.list_configs()


@router.post("/", response_model=ConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(body: ConfigCreate, handler: AgentConfigHandler = Depends(get_handler)):
    return await handler.create_config(body)


@router.get("/{config_id}", response_model=ConfigResponse)
async def get_config(config_id: str, handler: AgentConfigHandler = Depends(get_read_handler)):
    return await handler.get_config(config_id)


@router.put("/{config_id}", response_model=ConfigResponse)
async def update_config(config_id: str, body: ConfigUpdate, handler: AgentConfigHandler = Depends(get_handler)):
    return await handler.update_config(config_id, body)


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(config_id: str, handler: AgentConfigHandler = Depends(get_handler)):
    await handler.delete_config(config_id)
