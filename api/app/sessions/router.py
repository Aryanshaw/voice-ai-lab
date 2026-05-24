"""Sessions router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_db_session, get_readonly_session
from app.session_turns.models import PaginatedTurnsResponse

from .handler import SessionHandler
from .models import SessionCreate, SessionResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


async def get_handler(db: AsyncSession = Depends(get_db_session)) -> SessionHandler:
    return SessionHandler(db)


async def get_read_handler(db: AsyncSession = Depends(get_readonly_session)) -> SessionHandler:
    return SessionHandler(db)


@router.post("", response_model=SessionResponse)
async def create_session(
    body: SessionCreate,
    handler: SessionHandler = Depends(get_handler),
):
    return await handler.create(body.config_id)


@router.get("/by-config/{config_id}", response_model=list[SessionResponse])
async def list_sessions_by_config(
    config_id: str,
    handler: SessionHandler = Depends(get_read_handler),
):
    return await handler.list_by_config(config_id)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    handler: SessionHandler = Depends(get_read_handler),
):
    return await handler.get(session_id)


@router.get("/{session_id}/turns", response_model=PaginatedTurnsResponse)
async def get_turns(
    session_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    handler: SessionHandler = Depends(get_read_handler),
):
    return await handler.get_turns(session_id, skip, limit)
