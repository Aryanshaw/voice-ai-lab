"""WebSocket router — placeholder for Phase 2."""

from fastapi import APIRouter, WebSocket

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/session/{config_id}")
async def session_ws(config_id: str, websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"type": "info", "message": "WebSocket endpoint — implemented in Phase 2"})
    await websocket.close()
