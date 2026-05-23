"""Voices router — GET /api/voices/"""

from fastapi import APIRouter

from .handler import VoicesHandler
from .models import VoiceItem

router = APIRouter(prefix="/api/voices", tags=["voices"])


@router.get("/", response_model=list[VoiceItem])
async def list_voices():
    return await VoicesHandler().list_voices()
