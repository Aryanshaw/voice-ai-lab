"""FastAPI backend entrypoint — Voice Agent Lab."""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.cache import RedisManager
from config.db import Database
from config.logger import get_logger
from core.exceptions import register_exception_handlers

# Import all ORM models so SQLAlchemy can resolve relationships before mapper config
import app.agent_configs.models  # noqa: F401
import app.sessions.models       # noqa: F401
import app.session_turns.models  # noqa: F401
import app.metrics.models        # noqa: F401
import app.llm_models.models     # noqa: F401

from app.agent_configs.router import router as configs_router
from app.llm_models.router import router as llm_models_router
from app.llm_models.seeder import seed_if_empty
from app.voices.router import router as voices_router
from app.ws.router import router as ws_router

load_dotenv(override=True)
logger = get_logger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db = Database.initialize(DATABASE_URL)
    await db.connect()

    redis = RedisManager.initialize(REDIS_URL)
    await redis.connect()

    await seed_if_empty(db)

    _app.state.db = db
    _app.state.redis = redis

    logger.info("Voice Agent Lab startup complete.")
    yield

    await redis.disconnect()
    await db.disconnect()
    logger.info("Voice Agent Lab shutdown complete.")


app = FastAPI(title="Voice Agent Lab", lifespan=lifespan)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(configs_router)
app.include_router(llm_models_router)
app.include_router(voices_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
