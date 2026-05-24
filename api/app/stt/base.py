"""Abstract base class for STT providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class STTResult:
    transcript: str
    stt_ms: int


class BaseSTTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> STTResult: ...
