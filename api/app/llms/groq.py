"""Groq LLM provider stub — implemented in Phase 2."""

from typing import AsyncGenerator

from .base import BaseLLMProvider


class GroqProvider(BaseLLMProvider):
    def __init__(self, model_id: str, temperature: float) -> None:
        self.model_id = model_id
        self.temperature = temperature

    async def stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]:
        raise NotImplementedError("GroqProvider.stream() — implemented in Phase 2")
        yield  # make it a generator
