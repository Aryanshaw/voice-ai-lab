"""WebSocket pipeline handler.

Text protocol:
  Client → { "type": "message",     "session_id": "<uuid>", "content": "<text>" }
  Server → { "type": "token",        "content": "<token>" }  ×N
  Server → { "type": "turn_complete", "llm_ms": <int>, "turn_id": "<uuid>" }
  Server → { "type": "error",        "message": "<str>" }

Voice protocol:
  Client → { "type": "audio_voice",  "session_id": "<uuid>", "data": "<b64>", "mime_type": "audio/wav" }
  Server → { "type": "transcript",   "content": "<text>" }
  Server → { "type": "token",        "content": "<token>" }  ×N
  Server → { "type": "audio_chunk",  "data": "<b64>" }  ×N  (mp3 frames)
  Server → { "type": "tts_end" }
  Server → { "type": "turn_complete", "stt_ms": <int>, "llm_ms": <int>, "tts_ms": <int>, "turn_id": "<uuid>" }

Interrupt protocol (barge-in):
  Client → { "type": "interrupt",    "session_id": "<uuid>" }
  — cancels the current in-flight LLM/TTS task immediately
"""

import asyncio
import base64
import logging
import os
import time
from dataclasses import dataclass, field

import httpx
from fastapi import WebSocket, WebSocketDisconnect

from app.agent_configs.crud import AgentConfigCRUD
from app.llms.factory import LLMFactory
from app.metrics.crud import MetricCRUD
from app.session_turns.crud import SessionTurnCRUD
from app.sessions.crud import SessionCRUD
from app.stt.factory import STTFactory
from app.tts.elevenlabs import ElevenLabsTTSProvider

logger = logging.getLogger(__name__)

# Private/loopback IP prefixes — default to "in" for local dev
_PRIVATE_PREFIXES = ("127.", "::1", "10.", "192.168.", "172.")


@dataclass
class ConnectionState:
    locale: str = "in"
    # Per-session audio buffer: session_id → accumulated bytes
    audio_buffers: dict[str, list[bytes]] = field(default_factory=dict)
    # Per-session mime type (set on first audio_chunk)
    audio_mime: dict[str, str] = field(default_factory=dict)
    # Current in-flight LLM/TTS task — cancelled on interrupt or new message
    current_task: asyncio.Task | None = None
    # Lock protecting concurrent websocket sends from task + background tasks
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


# ── helpers ──────────────────────────────────────────────────────────────────

async def _detect_locale(websocket: WebSocket) -> str:
    """Detect user locale from IP. Returns "in" for India, "global" otherwise.

    Env override: STT_LOCALE=in|global skips HTTP lookup (useful in dev/test).
    """
    override = os.environ.get("STT_LOCALE", "").strip().lower()
    if override in ("in", "global"):
        return override

    client_ip = (websocket.client.host if websocket.client else None) or "127.0.0.1"

    if any(client_ip.startswith(p) for p in _PRIVATE_PREFIXES):
        return "in"  # local dev — assume Indian developer

    try:
        async with httpx.AsyncClient(timeout=2.0) as http:
            resp = await http.get(f"https://ip-api.com/json/{client_ip}?fields=countryCode")
            country = resp.json().get("countryCode", "")
            return "in" if country == "IN" else "global"
    except Exception:
        logger.warning("IP locale detection failed for %s, defaulting to 'global'", client_ip)
        return "global"


async def _safe_send(websocket: WebSocket, state: ConnectionState, data: dict) -> bool:
    """Send JSON protected by lock. Returns False if connection is closed."""
    try:
        async with state.send_lock:
            await websocket.send_json(data)
        return True
    except Exception:
        return False


async def _persist_metric(
    db_manager,
    config_id: str,
    session_id: str,
    stage: str,
    latency_ms: int,
) -> None:
    async with db_manager.session() as db:
        await MetricCRUD(db).create(config_id, session_id, stage, latency_ms)


async def _generate_session_title(
    db_manager,
    websocket: WebSocket,
    state: ConnectionState,
    session_id: str,
    config_id: str,
    first_user_message: str,
) -> None:
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

        await _safe_send(websocket, state, {
            "type": "session_title",
            "session_id": session_id,
            "title": title,
        })
    except Exception:
        pass  # best-effort


# ── shared LLM streaming logic ────────────────────────────────────────────────

async def _run_llm(
    websocket: WebSocket,
    state: ConnectionState,
    db_manager,
    session_id: str,
    content: str,
    stt_ms: int = 0,
) -> None:
    """Core LLM pipeline shared by text and voice paths.

    Streams tokens to client, persists turn, fires TTS if voice mode.
    Handles asyncio.CancelledError cleanly (barge-in interrupt).
    """
    try:
        async with db_manager.session() as db:
            session = await SessionCRUD(db).get(session_id)
            if not session:
                await _safe_send(websocket, state, {"type": "error", "message": "Session not found"})
                return

            config = await AgentConfigCRUD(db).get(session.config_id)
            if not config:
                await _safe_send(websocket, state, {"type": "error", "message": "Config not found"})
                return

            history, _ = await SessionTurnCRUD(db).list_by_session(session_id)
            messages = [{"role": t.role, "content": t.content} for t in history]
            messages.append({"role": "user", "content": content})

            system_parts = []
            if config.name:
                system_parts.append(f"You are {config.name}.")
            if config.description:
                system_parts.append(config.description)
            system_parts.append(config.system_prompt)
            system_prompt = "\n\n".join(filter(None, system_parts))

            provider = LLMFactory.create(config.model, config.temperature)
            logger.info(
                "[PIPELINE] LLM start | session=%s model=%s history_turns=%d",
                session_id, config.model, len(history),
            )
            t0 = time.monotonic()
            token_chunks: list[str] = []

            try:
                async for token in provider.stream(messages, system_prompt, config.temperature):
                    token_chunks.append(token)
                    if not await _safe_send(websocket, state, {"type": "token", "content": token}):
                        return
            except asyncio.CancelledError:
                logger.info("[PIPELINE] turn cancelled during LLM | session=%s", session_id)
                return
            except Exception as exc:
                logger.error("[PIPELINE] LLM failed | session=%s error=%s", session_id, exc)
                await _safe_send(websocket, state, {"type": "error", "message": str(exc)})
                return

            llm_ms = int((time.monotonic() - t0) * 1000)
            full_response = "".join(token_chunks)
            logger.info(
                "[PIPELINE] LLM complete | session=%s llm_ms=%d response_chars=%d response=%r",
                session_id, llm_ms, len(full_response), full_response[:200],
            )

            # TTS: stream full response if voice_id set and came via voice path
            tts_ms = 0
            voice_settings: dict = config.voice_settings or {}
            voice_id = voice_settings.get("voice_id", "")

            if voice_id and stt_ms > 0:
                logger.info(
                    "[PIPELINE] TTS start | session=%s voice_id=%s model=%s text_chars=%d",
                    session_id, voice_id, voice_settings.get("model_id"), len(full_response),
                )
                tts_provider = ElevenLabsTTSProvider.from_voice_settings(voice_settings)
                t_tts = time.monotonic()
                audio_chunk_count = 0
                try:
                    async for audio_chunk in tts_provider.stream_sentence(full_response):
                        audio_chunk_count += 1
                        if not await _safe_send(websocket, state, {
                            "type": "audio_chunk",
                            "data": base64.b64encode(audio_chunk).decode(),
                        }):
                            return
                    tts_ms = int((time.monotonic() - t_tts) * 1000)
                    logger.info(
                        "[PIPELINE] TTS complete | session=%s tts_ms=%d audio_chunks=%d",
                        session_id, tts_ms, audio_chunk_count,
                    )
                except asyncio.CancelledError:
                    logger.info("[PIPELINE] turn cancelled during TTS | session=%s", session_id)
                    return
                except Exception as exc:
                    logger.error("[PIPELINE] TTS failed | session=%s error=%s", session_id, exc)
                    # Non-fatal: operator still gets text response

                if not await _safe_send(websocket, state, {"type": "tts_end"}):
                    return
            elif stt_ms > 0 and not voice_id:
                logger.warning(
                    "[PIPELINE] TTS skipped — no voice_id in config | session=%s config=%s",
                    session_id, session.config_id,
                )

            turns_crud = SessionTurnCRUD(db)
            await turns_crud.create(session_id, "user", content, stt_ms=stt_ms)
            assistant_turn = await turns_crud.create(
                session_id, "assistant", full_response, llm_ms=llm_ms, tts_ms=tts_ms
            )

            config_id = session.config_id
            is_first_turn = len(history) == 0

        await _safe_send(websocket, state, {
            "type": "turn_complete",
            "stt_ms": stt_ms,
            "llm_ms": llm_ms,
            "tts_ms": tts_ms,
            "turn_id": assistant_turn.id,
        })

        asyncio.create_task(_persist_metric(db_manager, config_id, session_id, "llm", llm_ms))
        if stt_ms > 0:
            asyncio.create_task(_persist_metric(db_manager, config_id, session_id, "stt", stt_ms))
        if tts_ms > 0:
            asyncio.create_task(_persist_metric(db_manager, config_id, session_id, "tts", tts_ms))

        if is_first_turn:
            asyncio.create_task(
                _generate_session_title(db_manager, websocket, state, session_id, config_id, content)
            )

    except asyncio.CancelledError:
        logger.info("[PIPELINE] turn cancelled before LLM start | session=%s", session_id)


# ── message handlers ──────────────────────────────────────────────────────────

async def _handle_message(websocket: WebSocket, state: ConnectionState, data: dict) -> None:
    """Text path."""
    session_id = data.get("session_id")
    content = data.get("content", "").strip()

    if not session_id or not content:
        await _safe_send(websocket, state, {"type": "error", "message": "session_id and content required"})
        return

    await _run_llm(websocket, state, websocket.app.state.db, session_id, content, stt_ms=0)


def _handle_audio_chunk(state: ConnectionState, data: dict) -> None:
    """Buffer incoming base64 audio chunk — no I/O, no await needed."""
    session_id = data.get("session_id")
    b64_data = data.get("data", "")
    mime_type = data.get("mime_type", "audio/webm")

    if not session_id or not b64_data:
        return

    try:
        chunk_bytes = base64.b64decode(b64_data)
    except Exception:
        return

    if session_id not in state.audio_buffers:
        state.audio_buffers[session_id] = []
        state.audio_mime[session_id] = mime_type

    state.audio_buffers[session_id].append(chunk_bytes)


async def _handle_audio_end(
    websocket: WebSocket,
    state: ConnectionState,
    data: dict,
) -> None:
    """Legacy chunked voice path — STT → LLM + TTS."""
    session_id = data.get("session_id")
    if not session_id:
        await _safe_send(websocket, state, {"type": "error", "message": "session_id required"})
        return

    chunks = state.audio_buffers.pop(session_id, [])
    mime_type = state.audio_mime.pop(session_id, "audio/webm")

    if not chunks:
        await _safe_send(websocket, state, {"type": "error", "message": "No audio received"})
        return

    audio_bytes = b"".join(chunks)
    db_manager = websocket.app.state.db

    try:
        stt_provider = STTFactory.create(state.locale)
        stt_result = await stt_provider.transcribe(audio_bytes, mime_type)
    except Exception as exc:
        logger.error("STT failed: %s", exc)
        await _safe_send(websocket, state, {"type": "error", "message": f"STT failed: {exc}"})
        return

    if not stt_result.transcript:
        await _safe_send(websocket, state, {"type": "voice_reset", "reason": "empty_transcript"})
        return

    await _safe_send(websocket, state, {"type": "transcript", "content": stt_result.transcript})
    await _run_llm(websocket, state, db_manager, session_id, stt_result.transcript, stt_ms=stt_result.stt_ms)


async def _handle_audio_voice(
    websocket: WebSocket,
    state: ConnectionState,
    data: dict,
) -> None:
    """Voice path — single base64 audio message from client."""
    session_id = data.get("session_id")
    b64_data = data.get("data", "")
    mime_type = data.get("mime_type", "audio/wav")

    if not session_id or not b64_data:
        await _safe_send(websocket, state, {"type": "error", "message": "session_id and data required"})
        return

    try:
        audio_bytes = base64.b64decode(b64_data)
    except Exception:
        await _safe_send(websocket, state, {"type": "error", "message": "Invalid base64 audio data"})
        return

    logger.info(
        "[PIPELINE] audio_voice received | session=%s locale=%s mime=%s size_bytes=%d",
        session_id, state.locale, mime_type, len(audio_bytes),
    )

    db_manager = websocket.app.state.db

    stt_provider = STTFactory.create(state.locale)
    logger.info(
        "[PIPELINE] STT provider=%s | session=%s",
        stt_provider.__class__.__name__, session_id,
    )

    try:
        stt_result = await stt_provider.transcribe(audio_bytes, mime_type)
    except Exception as exc:
        logger.error("[PIPELINE] STT failed | session=%s error=%s", session_id, exc)
        await _safe_send(websocket, state, {"type": "error", "message": f"STT failed: {exc}"})
        return

    logger.info(
        "[PIPELINE] STT complete | session=%s stt_ms=%d transcript=%r",
        session_id, stt_result.stt_ms, stt_result.transcript[:200],
    )

    if not stt_result.transcript:
        logger.info("[PIPELINE] empty transcript — voice_reset | session=%s", session_id)
        await _safe_send(websocket, state, {"type": "voice_reset", "reason": "empty_transcript"})
        return

    await _safe_send(websocket, state, {"type": "transcript", "content": stt_result.transcript})
    await _run_llm(websocket, state, db_manager, session_id, stt_result.transcript, stt_ms=stt_result.stt_ms)


async def _cancel_current_task(state: ConnectionState) -> None:
    """Cancel in-flight LLM/TTS task and wait for it to finish."""
    if state.current_task and not state.current_task.done():
        state.current_task.cancel()
        try:
            await state.current_task
        except asyncio.CancelledError:
            pass
    state.current_task = None


# ── WS endpoint ───────────────────────────────────────────────────────────────

async def ws_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    state = ConnectionState(locale=await _detect_locale(websocket))
    logger.info("WS connect: locale=%s ip=%s", state.locale, websocket.client.host if websocket.client else "unknown")

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "interrupt":
                # Barge-in: cancel current turn immediately
                if state.current_task and not state.current_task.done():
                    logger.info("[PIPELINE] interrupt received — cancelling current task")
                    state.current_task.cancel()
                    state.current_task = None

            elif msg_type in ("message", "audio_voice", "audio_end"):
                # Cancel any in-flight task before starting a new turn
                await _cancel_current_task(state)

                if msg_type == "message":
                    state.current_task = asyncio.create_task(
                        _handle_message(websocket, state, data)
                    )
                elif msg_type == "audio_voice":
                    state.current_task = asyncio.create_task(
                        _handle_audio_voice(websocket, state, data)
                    )
                elif msg_type == "audio_end":
                    state.current_task = asyncio.create_task(
                        _handle_audio_end(websocket, state, data)
                    )

            elif msg_type == "audio_chunk":
                _handle_audio_chunk(state, data)  # legacy chunked path — sync, no task needed

            # unknown types (ping, etc.) ignored silently

    except WebSocketDisconnect:
        await _cancel_current_task(state)
