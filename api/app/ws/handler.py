"""WebSocket pipeline handler.

Protocol:
  Client → { "type": "message", "session_id": "<uuid>", "content": "<text>" }
  Server → { "type": "token", "content": "<token>" }  ×N
  Server → { "type": "turn_complete", "llm_ms": <int>, "turn_id": "<uuid>" }
  Server → { "type": "error", "message": "<str>" }  on failure
"""

import asyncio
import time

from fastapi import WebSocket, WebSocketDisconnect

from app.agent_configs.crud import AgentConfigCRUD
from app.llms.factory import LLMFactory
from app.metrics.crud import MetricCRUD
from app.session_turns.crud import SessionTurnCRUD
from app.sessions.crud import SessionCRUD


async def _persist_metric(
    db_manager,
    config_id: str,
    session_id: str,
    stage: str,
    latency_ms: int,
) -> None:
    """Write metric row in a fresh DB session — fire-and-forget."""
    async with db_manager.session() as db:
        await MetricCRUD(db).create(config_id, session_id, stage, latency_ms)


async def _generate_session_title(
    db_manager,
    websocket: WebSocket,
    session_id: str,
    config_id: str,
    first_user_message: str,
) -> None:
    """Call LLM to generate a short session title, persist it, send WS event."""
    from app.sessions.crud import SessionCRUD as _SessionCRUD

    try:
        async with db_manager.session() as db:
            config = await AgentConfigCRUD(db).get(config_id)
            if not config:
                return

            provider = LLMFactory.create(config.model, 0.3)
            prompt = (
                f"Generate a short 4-6 word title for a conversation that started with: "
                f'"{first_user_message[:300]}". '
                "Return ONLY the title text. No quotes. No punctuation at end."
            )
            chunks: list[str] = []
            async for token in provider.stream(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="You generate concise conversation titles. Return only the title, nothing else.",
                temperature=0.3,
            ):
                chunks.append(token)

            title = "".join(chunks).strip().strip('"').strip("'")[:200]
            await _SessionCRUD(db).update(session_id, title=title)

        await websocket.send_json({
            "type": "session_title",
            "session_id": session_id,
            "title": title,
        })
    except Exception:
        pass  # title generation is best-effort


async def _handle_message(websocket: WebSocket, data: dict) -> None:
    session_id = data.get("session_id")
    content = data.get("content", "").strip()

    if not session_id or not content:
        await websocket.send_json({"type": "error", "message": "session_id and content required"})
        return

    db_manager = websocket.app.state.db

    async with db_manager.session() as db:
        session = await SessionCRUD(db).get(session_id)
        if not session:
            await websocket.send_json({"type": "error", "message": "Session not found"})
            return

        config = await AgentConfigCRUD(db).get(session.config_id)
        if not config:
            await websocket.send_json({"type": "error", "message": "Config not found"})
            return

        # Build multi-turn history
        history, _ = await SessionTurnCRUD(db).list_by_session(session_id)
        messages = [{"role": t.role, "content": t.content} for t in history]
        messages.append({"role": "user", "content": content})

        # Build system prompt: prepend name + description so the LLM knows its identity
        system_parts = []
        if config.name:
            system_parts.append(f"You are {config.name}.")
        if config.description:
            system_parts.append(config.description)
        system_parts.append(config.system_prompt)
        system_prompt = "\n\n".join(filter(None, system_parts))

        provider = LLMFactory.create(config.model, config.temperature)
        t0 = time.monotonic()
        chunks: list[str] = []

        try:
            async for token in provider.stream(messages, system_prompt, config.temperature):
                chunks.append(token)
                await websocket.send_json({"type": "token", "content": token})
        except Exception as exc:
            await websocket.send_json({"type": "error", "message": str(exc)})
            return

        llm_ms = int((time.monotonic() - t0) * 1000)
        full_response = "".join(chunks)

        turns_crud = SessionTurnCRUD(db)
        await turns_crud.create(session_id, "user", content, stt_ms=0)
        assistant_turn = await turns_crud.create(
            session_id, "assistant", full_response, llm_ms=llm_ms, tts_ms=0
        )

        config_id = session.config_id
        is_first_turn = len(history) == 0  # history before this message

    await websocket.send_json({
        "type": "turn_complete",
        "llm_ms": llm_ms,
        "turn_id": assistant_turn.id,
    })

    asyncio.create_task(_persist_metric(db_manager, config_id, session_id, "llm", llm_ms))

    # After first turn only: generate session title in background
    if is_first_turn:
        asyncio.create_task(
            _generate_session_title(db_manager, websocket, session_id, config_id, content)
        )


async def ws_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "message":
                await _handle_message(websocket, data)
    except WebSocketDisconnect:
        pass
