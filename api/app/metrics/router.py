"""Metrics router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_readonly_session
from .handler import MetricsHandler
from .models import MetricsSummaryResponse

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


async def get_handler(db: AsyncSession = Depends(get_readonly_session)) -> MetricsHandler:
    return MetricsHandler(db)


@router.get("/summary", response_model=MetricsSummaryResponse)
async def get_metrics_summary(
    config_id: str,
    handler: MetricsHandler = Depends(get_handler),
):
    return await handler.get_summary(config_id)
