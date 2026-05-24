"""Metrics handler."""

from sqlalchemy.ext.asyncio import AsyncSession

from .crud import MetricCRUD
from .models import MetricsSummaryResponse


class MetricsHandler:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_summary(self, config_id: str) -> MetricsSummaryResponse:
        stages = await MetricCRUD(self.db).get_summary(config_id)
        return MetricsSummaryResponse(config_id=config_id, stages=stages)
