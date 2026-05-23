"""FastAPI backend entrypoint."""

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException

from config.db import connect_db
from config.logger import get_logger


logger = get_logger(__name__)

_db = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _db
    async with connect_db() as db:
        _db = db
        logger.info("REST API startup complete.")
        yield
    _db = None
    logger.info("REST API shutdown complete.")


app = FastAPI(title="Backrooms Backend", lifespan=lifespan)


@app.get("/")
async def root() -> dict:
    return {"message": "Backrooms backend is running"}


@app.get("/health")
async def health() -> dict:
    if not _db:
        raise HTTPException(status_code=503, detail="Database not ready")
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

