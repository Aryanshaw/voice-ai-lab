#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source .env
uv run python -c "
import asyncio
import redis.asyncio as aioredis
import os

async def main():
    client = aioredis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'), decode_responses=True)
    await client.ping()
    await client.flushall()
    await client.aclose()
    print('Redis flushed successfully.')

asyncio.run(main())
"
