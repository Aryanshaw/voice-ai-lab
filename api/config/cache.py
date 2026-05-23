"""Redis connection manager — singleton pattern."""

import json
from typing import Any, ClassVar

import redis.asyncio as aioredis

from config.logger import get_logger

logger = get_logger(__name__)


class RedisManager:
    _instance: ClassVar["RedisManager | None"] = None

    @classmethod
    def initialize(cls, url: str) -> "RedisManager":
        if cls._instance is None:
            instance = object.__new__(cls)
            instance._url = url
            instance._client: aioredis.Redis | None = None
            cls._instance = instance
        return cls._instance

    @classmethod
    def get_instance(cls) -> "RedisManager":
        if cls._instance is None:
            raise RuntimeError("RedisManager.initialize() must be called first.")
        return cls._instance

    async def connect(self) -> None:
        self._client = await aioredis.from_url(self._url, decode_responses=True)
        await self._client.ping()
        logger.info("Redis connection verified.")

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()
            logger.info("Redis connection closed.")

    async def get(self, key: str) -> str | None:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ttl: int = 3600) -> None:
        await self._client.set(key, value, ex=ttl)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def get_json(self, key: str) -> Any | None:
        raw = await self.get(key)
        return json.loads(raw) if raw else None

    async def set_json(self, key: str, value: Any, ttl: int = 3600) -> None:
        await self.set(key, json.dumps(value), ttl)
