"""Sarvam STT provider — optimised for Indian languages and accents."""

import logging
import os
import time

from sarvamai import AsyncSarvamAI

from .base import BaseSTTProvider, STTResult

logger = logging.getLogger(__name__)


class SarvamProvider(BaseSTTProvider):
    def __init__(self) -> None:
        self._client = AsyncSarvamAI(
            api_subscription_key=os.environ["SARVAM_API_KEY"]
        )

    async def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> STTResult:
        # Derive codec from mime_type: "audio/webm" → "webm", "audio/wav" → "wav"
        codec = mime_type.split("/")[-1].split(";")[0].strip()

        t0 = time.monotonic()
        try:
            response = await self._client.speech_to_text.transcribe(
                file=("audio." + codec, audio_bytes, mime_type),
                model="saarika:v2.5",
                language_code="en-IN",
                input_audio_codec=codec,  # type: ignore[arg-type]
            )
            stt_ms = int((time.monotonic() - t0) * 1000)
            transcript = response.transcript or ""
            return STTResult(transcript=transcript.strip(), stt_ms=stt_ms)
        except Exception as exc:
            logger.error("Sarvam STT failed: %s", exc)
            raise
