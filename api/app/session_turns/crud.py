"""SessionTurn CRUD."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config.logger import get_logger
from .models import SessionTurn

logger = get_logger(__name__)


class SessionTurnCRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        session_id: str,
        role: str,
        content: str,
        stt_ms: int | None = None,
        llm_ms: int | None = None,
        tts_ms: int | None = None,
    ) -> SessionTurn:
        try:
            turn = SessionTurn(
                session_id=session_id,
                role=role,
                content=content,
                stt_ms=stt_ms,
                llm_ms=llm_ms,
                tts_ms=tts_ms,
            )
            self.db.add(turn)
            await self.db.flush()
            await self.db.refresh(turn)
            return turn
        except Exception as e:
            logger.exception(f"error in create: {e}")
            raise

    async def list_by_session(
        self, session_id: str, skip: int = 0, limit: int = 50
    ) -> tuple[list[SessionTurn], int]:
        try:
            count_over = func.count().over().label("__total__")
            q = (
                select(SessionTurn, count_over)
                .where(SessionTurn.session_id == session_id)
                .order_by(SessionTurn.created_at)
                .offset(skip)
                .limit(limit)
            )
            rows = (await self.db.execute(q)).all()
            items = [row[0] for row in rows]
            total = rows[0][1] if rows else 0
            return items, total
        except Exception as e:
            logger.exception(f"error in list_by_session: {e}")
            raise
