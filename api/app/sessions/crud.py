"""Session CRUD."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.logger import get_logger
from .models import Session

logger = get_logger(__name__)


class SessionCRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, config_id: str) -> Session:
        try:
            session = Session(
                config_id=config_id,
            )
            self.db.add(session)
            await self.db.flush()
            await self.db.refresh(session)
            return session
        except Exception as e:
            logger.exception(f"error in create: {e}")
            raise

    async def get(self, session_id: str) -> Session | None:
        try:
            return await self.db.get(Session, session_id)
        except Exception as e:
            logger.exception(f"error in get: {e}")
            raise

    async def update(self, session_id: str, **fields) -> Session | None:
        try:
            session = await self.db.get(Session, session_id)
            if session:
                for key, value in fields.items():
                    setattr(session, key, value)
                await self.db.flush()
                await self.db.refresh(session)
            return session
        except Exception as e:
            logger.exception(f"error in update: {e}")
            raise

    async def list_by_config(self, config_id: str) -> list[Session]:
        try:
            result = await self.db.execute(
                select(Session)
                .where(Session.config_id == config_id)
                .order_by(Session.started_at.desc())
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.exception(f"error in list_by_config: {e}")
            raise

    async def list_all(self, skip: int = 0, limit: int = 50) -> list[Session]:
        try:
            result = await self.db.execute(
                select(Session)
                .order_by(Session.started_at.desc())
                .offset(skip)
                .limit(limit)
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.exception(f"error in list_all: {e}")
            raise
