#!/usr/bin/env bash
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

log()  { echo -e "${CYAN}[setup]${RESET} $*"; }
ok()   { echo -e "${GREEN}[setup]${RESET} $*"; }
warn() { echo -e "${YELLOW}[setup]${RESET} $*"; }

echo ""
echo -e "${BOLD}Voice Agent Lab — setup${RESET}"
echo "──────────────────────────────────────"

# ── API .env ──────────────────────────────────────────────────────────────────
if [ -f api/.env ]; then
  warn "api/.env already exists — skipping"
else
  cp api/.env.example api/.env
  ok "created api/.env from api/.env.example"
fi

# ── Client .env.local ─────────────────────────────────────────────────────────
if [ -f client/.env.local ]; then
  warn "client/.env.local already exists — skipping"
else
  cp client/.env.example client/.env.local
  ok "created client/.env.local from client/.env.example"
fi

# ── Python deps ───────────────────────────────────────────────────────────────
log "installing Python dependencies (uv sync)..."
uv sync --directory api --quiet
ok "Python dependencies installed"

# ── Node deps ─────────────────────────────────────────────────────────────────
log "installing Node dependencies (pnpm install)..."
pnpm install --silent
ok "Node dependencies installed"

# ── DB migrations ─────────────────────────────────────────────────────────────
log "running database migrations..."
if uv --directory api run alembic upgrade head 2>&1; then
  ok "database migrations applied"
else
  warn "migration failed — check DATABASE_URL in api/.env and retry: uv --directory api run alembic upgrade head"
fi

echo ""
echo "──────────────────────────────────────"
echo -e "${GREEN}${BOLD} Setup complete!${RESET}"
echo ""
echo -e "  Next steps:"
echo -e "  1. Edit ${BOLD}api/.env${RESET} — fill in real API keys:"
echo -e "     ${YELLOW}DATABASE_URL${RESET}       PostgreSQL connection string (required)"
echo -e "     ${YELLOW}GROQ_API_KEY${RESET}       Groq LLM + Whisper STT (required)"
echo -e "     ${YELLOW}ELEVEN_LABS_API_KEY${RESET} ElevenLabs TTS (required)"
echo -e "     ${YELLOW}SARVAM_API_KEY${RESET}     Sarvam STT for Indian English (optional)"
echo -e "     ${YELLOW}OPENAI_API_KEY${RESET}     OpenAI LLM (optional)"
echo -e "     ${YELLOW}ANTHROPIC_API_KEY${RESET}  Anthropic LLM (optional)"
echo -e "     ${YELLOW}REDIS_URL${RESET}          Redis URL (optional, default: redis://localhost:6379)"
echo -e "     ${YELLOW}STT_LOCALE${RESET}         STT provider override: 'in' or 'global' (optional)"
echo -e "     Edit ${BOLD}client/.env.local${RESET} if backend runs on a different port:
     ${YELLOW}NEXT_PUBLIC_WS_URL${RESET}  WebSocket URL (default: ws://localhost:8000/ws)
     ${YELLOW}NEXT_PUBLIC_API_URL${RESET} REST API URL  (default: http://localhost:8000)
  2. Start Redis:   ${BOLD}redis-server${RESET}"
echo -e "  3. Start dev:     ${BOLD}pnpm dev${RESET}"
echo ""
echo -e "  API →    http://localhost:8000"
echo -e "  Client → http://localhost:3000"
echo ""
