# Architecture — Voice Agent Lab

> Web-based platform for operators to configure, test, and monitor voice agents before production launch.

---

## System Overview

```mermaid
graph TB
    subgraph Browser
        UI[Next.js App]
        VAD[VAD ricky0123/vad-web]
        WS_CLIENT[WebSocket Client]
        AUDIO_OUT[Audio Playback]
    end

    subgraph Backend
        WS_EP[WebSocket /ws]
        REST[REST API]
        PIPELINE[STT-LLM-TTS Pipeline]
    end

    subgraph Services
        GROQ_LLM[Groq LLM]
        GROQ_STT[Groq Whisper STT]
        SARVAM[Sarvam STT Indian]
        ELEVEN[ElevenLabs TTS]
    end

    subgraph Storage
        PG[(PostgreSQL)]
        REDIS[(Redis)]
    end

    UI -->|text or audio| WS_CLIENT
    VAD -->|voice segments| WS_CLIENT
    WS_CLIENT -->|WebSocket| WS_EP
    WS_EP -->|tokens and audio| WS_CLIENT
    UI -->|HTTP| REST
    REST -->|responses| UI
    WS_EP --> PIPELINE
    PIPELINE --> GROQ_LLM
    PIPELINE --> GROQ_STT
    PIPELINE --> SARVAM
    PIPELINE --> ELEVEN
    PIPELINE -->|turns and metrics| PG
    REST -->|CRUD| PG
    WS_EP -->|session state| REDIS
    WS_CLIENT -->|mp3 chunks| AUDIO_OUT
```

---

## Request Flow — Voice Turn

```mermaid
sequenceDiagram
    participant Browser
    participant VAD as VAD (ONNX)
    participant WS as WebSocket Handler
    participant STT as STT Provider
    participant LLM as Groq LLM
    participant TTS as ElevenLabs TTS
    participant DB as PostgreSQL

    Browser->>VAD: raw mic audio
    VAD-->>Browser: speech segment detected
    Browser->>WS: {type: "audio_voice", data: <b64>, session_id}

    WS->>STT: audio bytes
    STT-->>WS: transcript + stt_ms
    WS-->>Browser: {type: "transcript", content}

    WS->>DB: load session history
    DB-->>WS: previous turns

    loop LLM streaming
        WS->>LLM: messages + system prompt
        LLM-->>WS: token
        WS-->>Browser: {type: "token", content}
    end

    WS->>DB: insert session_turn (user + assistant)
    WS->>DB: insert metric record

    loop TTS streaming (sentence by sentence)
        WS->>TTS: sentence text
        TTS-->>WS: mp3 chunk
        WS-->>Browser: {type: "audio_chunk", data: <b64>}
    end

    WS-->>Browser: {type: "tts_end"}
    WS-->>Browser: {type: "turn_complete", stt_ms, llm_ms, tts_ms, turn_id}
    Browser->>Browser: play audio chunks
```

---

## Request Flow — Text Turn

```mermaid
sequenceDiagram
    participant Browser
    participant WS as WebSocket Handler
    participant LLM as Groq LLM
    participant DB as PostgreSQL

    Browser->>WS: {type: "message", session_id, content}
    WS->>DB: load session + config + history

    loop LLM streaming
        WS->>LLM: messages + system prompt
        LLM-->>WS: token
        WS-->>Browser: {type: "token", content}
    end

    WS->>DB: insert session_turn
    WS->>DB: insert metric record
    WS-->>Browser: {type: "turn_complete", llm_ms, turn_id}
```

---

## Barge-In (Interrupt)

```mermaid
sequenceDiagram
    participant Browser
    participant WS as WebSocket Handler
    participant LLM as In-flight LLM Task
    participant TTS as In-flight TTS Task

    Browser->>WS: {type: "interrupt", session_id}
    WS->>LLM: asyncio.cancel()
    WS->>TTS: asyncio.cancel()
    WS-->>Browser: {type: "interrupted"}
```

---

## Directory Structure

```
tvaram/
├── api/                        # FastAPI backend
│   ├── main.py                 # App entrypoint, lifespan, router registration
│   ├── config/
│   │   ├── db.py               # Database singleton (asyncpg, pool_size=20)
│   │   ├── cache.py            # RedisManager singleton
│   │   ├── http.py             # Shared httpx.AsyncClient
│   │   └── logger.py           # Structured logging
│   ├── core/
│   │   ├── deps.py             # FastAPI Depends: db session, redis, handlers
│   │   └── exceptions.py       # Custom HTTP exceptions
│   ├── app/
│   │   ├── agent_configs/      # Config CRUD (models, crud, handler, router)
│   │   ├── sessions/           # Session CRUD + listing
│   │   ├── session_turns/      # Turn storage with pagination
│   │   ├── metrics/            # Latency metrics CRUD + summary endpoint
│   │   ├── llm_models/         # LLM registry + seeder
│   │   ├── voices/             # Voice registry
│   │   ├── llms/               # LLM providers (Groq)
│   │   ├── stt/                # STT providers (Whisper, Sarvam) + factory
│   │   ├── tts/                # TTS provider (ElevenLabs)
│   │   └── ws/                 # WebSocket endpoint + pipeline handler
│   └── migrations/             # Alembic migrations
│
└── client/                     # Next.js frontend
    └── src/
        ├── app/
        │   ├── page.tsx                # Home
        │   ├── configs/                # Agent config CRUD UI
        │   ├── sessions/[id]/          # Live session + voice interaction
        │   ├── history/                # Session history list + playback
        │   └── metrics/                # Latency dashboard (Recharts)
        ├── providers/
        │   ├── WebsocketProvider.tsx   # Global WS context, pub/sub, reconnect
        │   ├── QueryProvider.tsx       # TanStack Query
        │   └── ThemeProvider.tsx       # Dark/light mode
        ├── services/                   # API clients (sessions, configs, metrics)
        └── types/                      # TypeScript interfaces
```

---

## Database Schema

```mermaid
erDiagram
    agent_configs {
        string id PK
        string name
        string description
        text system_prompt
        string model
        float temperature
        jsonb voice_settings
        timestamp created_at
        timestamp updated_at
    }

    sessions {
        string id PK
        string config_id FK
        string title
        string status
        timestamp started_at
        timestamp ended_at
    }

    session_turns {
        string id PK
        string session_id FK
        string role
        text content
        int stt_ms
        int llm_ms
        int tts_ms
        timestamp created_at
    }

    metrics {
        string id PK
        string session_id FK
        string config_id FK
        int stt_duration_ms
        int llm_duration_ms
        int tts_duration_ms
        int total_duration_ms
        string error
        timestamp created_at
    }

    agent_configs ||--o{ sessions : "has"
    agent_configs ||--o{ metrics : "has"
    sessions ||--o{ session_turns : "has"
    sessions ||--o{ metrics : "has"
```

---

## WebSocket Protocol

All messages are JSON over a single persistent WebSocket connection at `/ws`.

### Client → Server

| `type` | Fields | Description |
|--------|--------|-------------|
| `message` | `session_id`, `content` | Send text turn |
| `audio_voice` | `session_id`, `data` (base64), `mime_type` | Send audio for STT→LLM→TTS |
| `interrupt` | `session_id` | Cancel in-flight LLM/TTS |

### Server → Client

| `type` | Fields | Description |
|--------|--------|-------------|
| `transcript` | `content` | STT result |
| `token` | `content` | Streaming LLM token |
| `audio_chunk` | `data` (base64 mp3) | TTS audio frame |
| `tts_end` | — | TTS stream complete |
| `turn_complete` | `turn_id`, `stt_ms?`, `llm_ms?`, `tts_ms?` | Turn finished with latencies |
| `interrupted` | — | Barge-in acknowledged |
| `error` | `message` | Pipeline error |

---

## STT Provider Selection

Locale is detected from client IP at WebSocket connection time. Override via `STT_LOCALE` env var.

```mermaid
flowchart LR
    IP[Client IP] --> CHECK{Private IP\nor STT_LOCALE=in?}
    CHECK -->|yes| SARVAM[Sarvam saarika:v2.5\nIndian English]
    CHECK -->|no| WHISPER[Groq whisper-large-v3-turbo\nGlobal English]
```

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/configs` | List agent configs |
| `POST` | `/api/configs` | Create config |
| `GET` | `/api/configs/{id}` | Get config |
| `PUT` | `/api/configs/{id}` | Update config |
| `DELETE` | `/api/configs/{id}` | Delete config |
| `GET` | `/api/sessions` | List sessions (paginated) |
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions/{id}` | Get session |
| `GET` | `/api/sessions/{id}/turns` | Get turns (paginated, max 200) |
| `GET` | `/api/sessions/by-config/{config_id}` | Sessions for a config |
| `GET` | `/api/metrics/summary?config_id=` | Latency summary (avg/min/max/p50/p90/p99) |
| `GET` | `/api/voices` | List available TTS voices |
| `GET` | `/api/llm-models` | List available LLM models |

---

## Key Design Decisions

### 1. Single WebSocket per Client
One persistent connection handles both text and voice. Message `type` field routes to the correct handler. Avoids connection overhead per turn and enables server-push (tokens, audio chunks) without polling.

### 2. Sentence-Level TTS Streaming
ElevenLabs is called once per sentence (split on punctuation), not once for the full response. First audio chunk plays while remaining sentences are still being generated — reduces perceived TTS latency.

### 3. Locale-Based STT Routing
Sarvam AI handles Indian-accented English better than Whisper for `en-IN`. Selection is automatic based on client IP, with an env var override for development.

### 4. No Explicit Session End
Sessions are created via `POST /api/sessions` and never explicitly closed. `ended_at` is derived from the last turn's `created_at`. This simplifies client logic — no teardown handshake needed.

### 5. Per-Stage Latency Capture
Every turn stores `stt_ms`, `llm_ms`, `tts_ms` independently in both `session_turns` and `metrics`. This enables per-stage p50/p90/p99 breakdowns in the dashboard rather than just total latency.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL async URL (`postgresql+asyncpg://...`) |
| `GROQ_API_KEY` | Yes | Groq API key (LLM + Whisper STT) |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs TTS key |
| `SARVAM_API_KEY` | No | Sarvam STT key (Indian English) |
| `REDIS_URL` | No | Redis URL (default: `redis://localhost:6379`) |
| `STT_LOCALE` | No | Override STT provider: `in` or `global` |
