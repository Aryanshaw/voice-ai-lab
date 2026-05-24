"""Metric CRUD."""

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from config.logger import get_logger
from .models import Metric, StageStats

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

    async def get_summary(self, config_id: str) -> list[StageStats]:
        """Return p50/p90/p99 per pipeline stage using PostgreSQL percentile_cont."""
        try:
            q = (
                select(
                    Metric.stage,
                    func.percentile_cont(0.5).within_group(Metric.latency_ms.asc()).label("p50"),
                    func.percentile_cont(0.9).within_group(Metric.latency_ms.asc()).label("p90"),
                    func.percentile_cont(0.99).within_group(Metric.latency_ms.asc()).label("p99"),
                    func.avg(Metric.latency_ms).label("avg"),
                    func.count(Metric.id).label("count"),
                )
                .where(Metric.config_id == config_id)
                .group_by(Metric.stage)
                .order_by(Metric.stage)
            )
            rows = (await self.db.execute(q)).all()
            return [
                StageStats(
                    stage=row.stage,
                    p50=round(float(row.p50 or 0), 1),
                    p90=round(float(row.p90 or 0), 1),
                    p99=round(float(row.p99 or 0), 1),
                    avg=round(float(row.avg or 0), 1),
                    count=row.count,
                )
                for row in rows
            ]
        except Exception as e:
            logger.exception(f"error in get_summary: {e}")
            raise
