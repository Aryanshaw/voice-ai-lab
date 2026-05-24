"""Shared FastAPI dependencies."""

from typing import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from config.cache import RedisManager


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    db = request.app.state.db
    async with db.session() as session:
        yield session


async def get_readonly_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    db = request.app.state.db
    async with db.readonly_session() as session:
        yield session


def get_redis(request: Request) -> RedisManager:
    return request.app.state.redis
