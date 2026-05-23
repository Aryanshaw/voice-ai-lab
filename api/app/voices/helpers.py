"""Voices helpers — ElevenLabs fetch and response parsing."""

import os
from typing import Any

from config import http
from .models import ELModel, VoiceItem

_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
_BASE = "https://api.elevenlabs.io/v1"
_HEADERS = {"xi-api-key": _API_KEY}


async def fetch_elevenlabs(path: str) -> Any:
    """GET any ElevenLabs v1 endpoint, return parsed JSON."""
    return await http.get(
        f"{_BASE}/{path}",
        headers=_HEADERS,
        error_detail=f"Failed to fetch {path} from ElevenLabs",
    )


def parse_voices(data: dict) -> list[VoiceItem]:
    voices = []
    for v in data.get("voices", []):
        if not v.get("preview_url"):
            continue
        lbl = v.get("labels", {})
        voices.append(VoiceItem(
            voice_id=v["voice_id"],
            name=v["name"],
            category=v.get("category", "premade"),
            preview_url=v["preview_url"],
            labels={
                "gender": lbl.get("gender"),
                "accent": lbl.get("accent"),
                "use_case": lbl.get("use_case"),
                "age": lbl.get("age"),
                "descriptive": lbl.get("descriptive"),
            },
        ))
    return voices


def parse_models(data: list) -> list[ELModel]:
    return [
        ELModel(id=m["model_id"], label=m["name"])
        for m in data
        if m.get("can_do_text_to_speech")
    ]
