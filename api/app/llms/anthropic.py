"""Anthropic LLM provider — streams tokens via Anthropic async SDK."""

import os
from typing import AsyncGenerator

import anthropic as anthropic_sdk

from .base import BaseLLMProvider

_DEFAULT_MAX_TOKENS = 1024


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, model_id: str, temperature: float) -> None:
        self.model_id = model_id
        self.temperature = temperature
        self._client = anthropic_sdk.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    async def stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]:
        async with self._client.messages.stream(
            model=self.model_id,
            system=system_prompt,
            messages=messages,
            temperature=self.temperature,
            max_tokens=_DEFAULT_MAX_TOKENS,
        ) as stream:
            async for text in stream.text_stream:
                yield text
