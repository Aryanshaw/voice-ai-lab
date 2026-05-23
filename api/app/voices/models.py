"""Voices — Pydantic schemas for ElevenLabs voice and model data."""

from pydantic import BaseModel


class VoiceLabel(BaseModel):
    gender: str | None = None
    accent: str | None = None
    use_case: str | None = None
    age: str | None = None
    descriptive: str | None = None


class VoiceItem(BaseModel):
    voice_id: str
    name: str
    category: str
    preview_url: str | None
    labels: VoiceLabel


class ELModel(BaseModel):
    id: str    # ElevenLabs model_id
    label: str
