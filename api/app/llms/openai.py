"""OpenAI LLM provider — streams tokens via OpenAI async SDK."""

import os
from typing import AsyncGenerator

from openai import AsyncOpenAI

from .base import BaseLLMProvider


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, model_id: str, temperature: float) -> None:
        self.model_id = model_id
        self.temperature = temperature
        self._client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    async def stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]:
        all_messages = [{"role": "system", "content": system_prompt}] + messages
        response = await self._client.chat.completions.create(
            model=self.model_id,
            messages=all_messages,
            temperature=self.temperature,
            stream=True,
        )
        async for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content
