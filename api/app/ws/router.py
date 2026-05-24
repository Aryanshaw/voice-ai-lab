"""WebSocket router — global persistent connection."""

from fastapi import APIRouter, WebSocket

from .handler import ws_endpoint

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await ws_endpoint(websocket)
