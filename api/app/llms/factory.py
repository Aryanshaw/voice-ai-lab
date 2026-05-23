"""LLM provider factory."""

from typing import ClassVar

from .base import BaseLLMProvider
from .groq import GroqProvider


class LLMFactory:
    _registry: ClassVar[dict[str, type[BaseLLMProvider]]] = {
        "groq": GroqProvider,
    }

    @classmethod
    def create(cls, model_slug: str, temperature: float) -> BaseLLMProvider:
        parts = model_slug.split("/", 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid model slug '{model_slug}'. Expected 'provider/model'.")
        provider, model_id = parts
        if provider not in cls._registry:
            raise ValueError(f"Unknown provider '{provider}'.")
        return cls._registry[provider](model_id=model_id, temperature=temperature)
