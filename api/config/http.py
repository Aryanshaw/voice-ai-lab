"""Shared async HTTP client — thin wrapper over httpx."""

from typing import Any

import httpx
from fastapi import HTTPException

from config.logger import get_logger

logger = get_logger(__name__)


async def get(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    timeout: float = 10.0,
    error_detail: str = "Upstream request failed",
) -> Any:
    """GET url, return parsed JSON. Raises HTTP 502 on any httpx error."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as exc:
        logger.error(f"HTTP GET {url} failed: {exc}")
        raise HTTPException(status_code=502, detail=error_detail)


async def post(
    url: str,
    *,
    json: Any | None = None,
    data: Any | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 10.0,
    error_detail: str = "Upstream request failed",
) -> Any:
    """POST url, return parsed JSON. Raises HTTP 502 on any httpx error."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=json, data=data, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as exc:
        logger.error(f"HTTP POST {url} failed: {exc}")
        raise HTTPException(status_code=502, detail=error_detail)
