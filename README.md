# Voice Agent Lab

Web platform for operators to configure, test, and monitor voice agents before production launch. Supports real-time text and voice interaction, session history, and per-stage latency monitoring.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design, data flow diagrams, and design decisions.

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| Database | PostgreSQL (asyncpg) |
| Cache | Redis |
| LLM | Groq/OpenAi/Anthropic (streaming) |
| STT | Groq Whisper (global) / Sarvam (Indian English) |
| TTS | ElevenLabs (streaming, sentence-level) |
| VAD | @ricky0123/vad-web (ONNX, client-side) |
| Frontend | Next.js 16 (App Router), Tailwind v4, Recharts |
| WebSocket | Single persistent connection per client |

---

## Features

- **Agent Config CRUD** — create configs with system prompt, model, temperature, voice settings
- **Live Session** — real-time text and voice interaction with streaming LLM responses
- **Voice Pipeline** — VAD → STT → LLM → TTS with barge-in (interrupt) support
- **Session History** — browse past sessions, replay turn-by-turn with timestamps
- **Metrics Dashboard** — per-stage latency (STT / LLM / TTS) with p50/p90/p99 breakdowns

---

## Prerequisites

- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [pnpm](https://pnpm.io/)
- Node.js >= 18
- PostgreSQL database
- Redis (local: `redis-server`, uses `dump.rdb` for persistence)

---

## Setup

### 1. Clone and install

```bash
# Install Python dependencies
uv sync --directory api

# Install frontend dependencies
pnpm install
```

### 2. Configure environment

```bash
cp api/.env.example api/.env
```

Edit `api/.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/voicelab
GROQ_API_KEY=<your-groq-key>
ELEVENLABS_API_KEY=<your-elevenlabs-key>
SARVAM_API_KEY=<your-sarvam-key>          # optional, for Indian English STT
REDIS_URL=redis://localhost:6379           # optional, defaults to this
STT_LOCALE=in                             # optional: "in" or "global"
```

Edit `client/.env.local`:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Database migrations

```bash
# Apply all migrations
uv --directory api run alembic upgrade head

# Create migration after model changes
uv --directory api run alembic revision --autogenerate -m "description"

# Rollback one step
uv --directory api run alembic downgrade -1
```

### 4. Start Redis

```bash
redis-server
```

---

## Running

```bash
# Run API + client concurrently
pnpm dev

# API only (http://localhost:8000)
pnpm dev:api

# Client only (http://localhost:3000)
pnpm dev:client
```

---

## Project Structure

```
tvaram/
├── api/                    # FastAPI backend
│   ├── main.py             # Entrypoint, lifespan, middleware
│   ├── config/             # DB, Redis, HTTP, logger singletons
│   ├── core/               # Depends factories, exceptions
│   ├── app/
│   │   ├── agent_configs/  # Config CRUD
│   │   ├── sessions/       # Session CRUD
│   │   ├── session_turns/  # Turn storage
│   │   ├── metrics/        # Latency metrics + summary
│   │   ├── llms/           # LLM providers (Groq)
│   │   ├── stt/            # STT providers + locale factory
│   │   ├── tts/            # ElevenLabs TTS
│   │   └── ws/             # WebSocket endpoint + pipeline
│   └── migrations/         # Alembic
│
└── client/                 # Next.js frontend
    └── src/
        ├── app/
        │   ├── configs/    # Agent config UI
        │   ├── sessions/   # Live session UI
        │   ├── history/    # Session history + playback
        │   └── metrics/    # Latency dashboard
        ├── providers/      # WS context, TanStack Query, theme
        ├── services/       # REST API clients
        └── types/          # TypeScript interfaces
```

---

## API Reference

Full REST API and WebSocket protocol documented in [ARCHITECTURE.md](./ARCHITECTURE.md#rest-api).

Quick reference:

| Endpoint | Description |
|----------|-------------|
| `GET /api/configs` | List agent configs |
| `POST /api/configs` | Create config |
| `POST /api/sessions` | Start session |
| `GET /api/sessions/{id}/turns` | Get turns |
| `GET /api/metrics/summary?config_id=` | Latency stats |
| `WS /ws` | Real-time voice/text pipeline |
