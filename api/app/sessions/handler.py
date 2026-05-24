"""Session handler — business logic layer."""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_configs.crud import AgentConfigCRUD
from app.session_turns.crud import SessionTurnCRUD
from app.session_turns.models import PaginatedTurnsResponse, TurnResponse

from .crud import SessionCRUD
from .models import SessionResponse


class SessionHandler:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.crud = SessionCRUD(db)

    async def create(self, config_id: str) -> SessionResponse:
        config = await AgentConfigCRUD(self.db).get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Config not found")
        session = await self.crud.create(config_id)
        return SessionResponse.model_validate(session)

    async def list_by_config(self, config_id: str) -> list[SessionResponse]:
        sessions = await self.crud.list_by_config(config_id)
        return [SessionResponse.model_validate(s) for s in sessions]

    async def get(self, session_id: str) -> SessionResponse:
        session = await self.crud.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return SessionResponse.model_validate(session)

    async def get_turns(self, session_id: str, skip: int = 0, limit: int = 50) -> PaginatedTurnsResponse:
        turn_crud = SessionTurnCRUD(self.db)
        items, total = await turn_crud.list_by_session(session_id, skip, limit)
        return PaginatedTurnsResponse(
            items=[TurnResponse.model_validate(t) for t in items],
            total=total,
            skip=skip,
            limit=limit,
        )
