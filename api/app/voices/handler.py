"""Voices handler — cache logic for ElevenLabs voices and TTS models."""
import os
from fastapi import HTTPException

from config.cache import RedisManager
from config.logger import get_logger
from .helpers import fetch_elevenlabs, parse_models, parse_voices
from .models import ELModel, VoiceItem

logger = get_logger(__name__)

_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
_CACHE_KEY = "elevenlabs:voices"
_MODELS_CACHE_KEY = "elevenlabs:models"
_CACHE_TTL = 3600
_MODELS_CACHE_TTL = 86400


class VoicesHandler:
    """
    Voice handler for ElevenLabs voices and TTS models
    """
    async def list_voices(self) -> list[VoiceItem]:
        """
        List all available ElevenLabs voices.
        """
        try:
            redis = RedisManager.get_instance()

            cached = await redis.get_json(_CACHE_KEY)
            if cached:
                return [VoiceItem(**v) for v in cached]

            if not _API_KEY:
                raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY not configured")

            voices = parse_voices(await fetch_elevenlabs("voices"))
            await redis.set_json(_CACHE_KEY, [v.model_dump() for v in voices], _CACHE_TTL)
            logger.info(f"Fetched {len(voices)} voices from ElevenLabs, cached for {_CACHE_TTL}s")
            return voices
        except Exception as e:
            logger.error(f"Error fetching voices from ElevenLabs: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch voices from ElevenLabs")

    async def list_models(self) -> list[ELModel]:
        """
        List all available ElevenLabs TTS models.
        """
        try:
            redis = RedisManager.get_instance()

            cached = await redis.get_json(_MODELS_CACHE_KEY)
            if cached:
                return [ELModel(**m) for m in cached]

            if not _API_KEY:
                raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY not configured")

            models = parse_models(await fetch_elevenlabs("models"))
            await redis.set_json(_MODELS_CACHE_KEY, [m.model_dump() for m in models], _MODELS_CACHE_TTL)
            logger.info(f"Fetched {len(models)} EL TTS models, cached for {_MODELS_CACHE_TTL}s")
            return models
        except Exception as e:
            logger.error(f"Error fetching models from ElevenLabs: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch models from ElevenLabs")
