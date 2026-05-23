"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator


class BaseLLMProvider(ABC):
    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]: ...
