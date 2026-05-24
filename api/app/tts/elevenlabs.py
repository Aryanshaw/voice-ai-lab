"""ElevenLabs TTS provider — sentence-level streaming."""

import logging
import os
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass

from elevenlabs import AsyncElevenLabs, VoiceSettings

logger = logging.getLogger(__name__)


@dataclass
class TTSResult:
    tts_ms: int


class ElevenLabsTTSProvider:
    def __init__(self, voice_id: str, model_id: str, stability: float, similarity_boost: float) -> None:
        self._client = AsyncElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
        self._voice_id = voice_id
        self._model_id = model_id
        self._voice_settings = VoiceSettings(
            stability=stability,
            similarity_boost=similarity_boost,
        )

    async def stream_sentence(self, text: str) -> AsyncIterator[bytes]:
        """Stream audio chunks for a single sentence/phrase."""
        logger.info(
            "[TTS] sending to ElevenLabs | voice=%s model=%s text=%r",
            self._voice_id, self._model_id, text[:120],
        )
        chunk_count = 0
        total_bytes = 0
        try:
            # .stream() returns an AsyncIterator directly — do NOT await it
            async for chunk in self._client.text_to_speech.stream(
                voice_id=self._voice_id,
                text=text,
                model_id=self._model_id,
                voice_settings=self._voice_settings,
                optimize_streaming_latency=3,
                output_format="mp3_44100_128",
            ):
                if chunk:
                    chunk_count += 1
                    total_bytes += len(chunk)
                    yield chunk
            logger.info("[TTS] stream complete | chunks=%d total_bytes=%d", chunk_count, total_bytes)
        except Exception as exc:
            logger.error("[TTS] ElevenLabs failed | text=%r error=%s", text[:50], exc)
            raise

    @classmethod
    def from_voice_settings(cls, voice_settings: dict) -> "ElevenLabsTTSProvider":
        return cls(
            voice_id=voice_settings.get("voice_id", "21m00Tcm4TlvDq8ikWAM"),
            model_id=voice_settings.get("model_id", "eleven_turbo_v2"),
            stability=voice_settings.get("stability", 0.5),
            similarity_boost=voice_settings.get("similarity_boost", 0.75),
        )
