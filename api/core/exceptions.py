"""Global exception handlers."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(404)
    async def not_found(request: Request, exc):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    @app.exception_handler(500)
    async def server_error(request: Request, exc):
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
