# tvaram — Monorepo

- **api/** — FastAPI backend with async PostgreSQL (SQLAlchemy + Alembic)
- **client/** — Next.js frontend (App Router, Tailwind v4, Aceternity UI)

## Prerequisites

- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [pnpm](https://pnpm.io/)
- Node.js >= 18

## Setup

```bash
# Install Python dependencies
uv sync --directory api

# Install frontend dependencies
pnpm install
```

### Environment

Copy the example env file and configure your database:

```bash
cp api/.env.example api/.env
```

`DATABASE_URL` must point to a PostgreSQL database (Neon, local, etc.).

### Database Migrations

```bash
# Apply pending migrations
uv --directory api run alembic upgrade head

# Create a new migration after model changes
uv --directory api run alembic revision --autogenerate -m "description"

# Rollback one step
uv --directory api run alembic downgrade -1
```

## Running

```bash
# Run both API and client concurrently
pnpm dev

# Run only the API (http://localhost:8080)
pnpm dev:api

# Run only the client (http://localhost:3000)
pnpm dev:client
```
