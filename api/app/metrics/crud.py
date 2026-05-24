"""Metric CRUD."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.logger import get_logger
from .models import Metric

logger = get_logger(__name__)


class MetricCRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        config_id: str,
        session_id: str,
        stage: str,
        latency_ms: int,
        error: bool = False,
    ) -> Metric:
        try:
            metric = Metric(
                config_id=config_id,
                session_id=session_id,
                stage=stage,
                latency_ms=latency_ms,
                error=error,
            )
            self.db.add(metric)
            await self.db.flush()
            await self.db.refresh(metric)
            return metric
        except Exception as e:
            logger.exception(f"error in create: {e}")
            raise

    async def list_by_config(self, config_id: str) -> list[Metric]:
        try:
            result = await self.db.execute(
                select(Metric)
                .where(Metric.config_id == config_id)
                .order_by(Metric.created_at.desc())
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.exception(f"error in list_by_config: {e}")
            raise
