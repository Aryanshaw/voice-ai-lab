"""Voices router — GET /api/voices/ and GET /api/voices/models/"""

from fastapi import APIRouter

from .handler import VoicesHandler
from .models import ELModel, VoiceItem

router = APIRouter(prefix="/api/voices", tags=["voices"])


@router.get("/models/", response_model=list[ELModel])
async def list_models():
    return await VoicesHandler().list_models()


@router.get("/", response_model=list[VoiceItem])
async def list_voices():
    return await VoicesHandler().list_voices()
