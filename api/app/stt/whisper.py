"""Groq Whisper STT provider — for non-Indian users."""

import logging
import os
import time

from groq import AsyncGroq

from .base import BaseSTTProvider, STTResult

logger = logging.getLogger(__name__)


class WhisperProvider(BaseSTTProvider):
    def __init__(self) -> None:
        self._client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

    async def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> STTResult:
        codec = mime_type.split("/")[-1].split(";")[0].strip()
        filename = f"audio.{codec}"

        t0 = time.monotonic()
        try:
            response = await self._client.audio.transcriptions.create(
                file=(filename, audio_bytes, mime_type),
                model="whisper-large-v3-turbo",
                language="en",
            )
            stt_ms = int((time.monotonic() - t0) * 1000)
            transcript = response.text or ""
            return STTResult(transcript=transcript.strip(), stt_ms=stt_ms)
        except Exception as exc:
            logger.error("Whisper STT failed: %s", exc)
            raise
