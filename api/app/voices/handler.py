"""Voices handler — fetches from ElevenLabs API, caches in Redis."""

import os

import httpx
from fastapi import HTTPException

from config.cache import RedisManager
from config.logger import get_logger
from .models import VoiceItem

logger = get_logger(__name__)

_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
_VOICES_URL = "https://api.elevenlabs.io/v1/voices"
_CACHE_KEY = "elevenlabs:voices"
_CACHE_TTL = 3600  # 1 hour


class VoicesHandler:
    async def list_voices(self) -> list[VoiceItem]:
        """Return cached voices or fetch fresh from ElevenLabs."""
        redis = RedisManager.get_instance()

        cached = await redis.get_json(_CACHE_KEY)
        if cached:
            return [VoiceItem(**v) for v in cached]

        if not _API_KEY:
            raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY not configured")

        raw = await self._fetch_from_elevenlabs()
        voices = self._parse(raw)

        await redis.set_json(_CACHE_KEY, [v.model_dump() for v in voices], _CACHE_TTL)
        logger.info(f"Fetched {len(voices)} voices from ElevenLabs, cached for {_CACHE_TTL}s")
        return voices

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _fetch_from_elevenlabs(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(_VOICES_URL, headers={"xi-api-key": _API_KEY})
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPError as exc:
            logger.error(f"ElevenLabs API error: {exc}")
            raise HTTPException(status_code=502, detail="Failed to fetch voices from ElevenLabs")

    @staticmethod
    def _parse(data: dict) -> list[VoiceItem]:
        voices = []
        for v in data.get("voices", []):
            if not v.get("preview_url"):
                continue  # skip voices with no audio preview
            lbl = v.get("labels", {})
            voices.append(VoiceItem(
                voice_id=v["voice_id"],
                name=v["name"],
                category=v.get("category", "premade"),
                preview_url=v["preview_url"],
                labels={
                    "gender": lbl.get("gender"),
                    "accent": lbl.get("accent"),
                    "use_case": lbl.get("use_case"),
                    "age": lbl.get("age"),
                    "descriptive": lbl.get("descriptive"),
                },
            ))
        return voices
