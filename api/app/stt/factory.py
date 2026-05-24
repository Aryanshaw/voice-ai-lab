"""STT provider factory — routes by user locale."""

from .base import BaseSTTProvider
from .sarvam import SarvamProvider
from .whisper import WhisperProvider


class STTFactory:
    @staticmethod
    def create(locale: str) -> BaseSTTProvider:
        """
        locale: "in" → SarvamProvider (Indian languages/accents)
                anything else → WhisperProvider (Groq Whisper)
        """
        if locale == "in":
            return SarvamProvider()
        return WhisperProvider()
