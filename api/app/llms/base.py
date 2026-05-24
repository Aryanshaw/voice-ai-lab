"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator


class BaseLLMProvider(ABC):
    def __init__(self, model_id: str, temperature: float) -> None:
        self.model_id = model_id
        self.temperature = temperature

    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]: ...
