"""Async PostgreSQL database setup — singleton pattern."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, ClassVar

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config.logger import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    pass


class Database:
    _instance: ClassVar["Database | None"] = None

    @classmethod
    def initialize(cls, url: str) -> "Database":
        if cls._instance is None:
            instance = object.__new__(cls)
            instance._setup(url)
            cls._instance = instance
        return cls._instance

    @classmethod
    def get_instance(cls) -> "Database":
        if cls._instance is None:
            raise RuntimeError("Database.initialize() must be called first.")
        return cls._instance

    def _setup(self, url: str) -> None:
        if not url:
            raise ValueError("DATABASE_URL is not set.")
        self.engine = create_async_engine(
            url,
            echo=False,
            pool_size=5,
            max_overflow=2,
            pool_recycle=120,
            connect_args={"statement_cache_size": 0},
        )
        self.session_factory = async_sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def connect(self) -> None:
        async with self.engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")

    async def disconnect(self) -> None:
        await self.engine.dispose()
        logger.info("Database connection closed.")

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    @asynccontextmanager
    async def readonly_session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self.session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
