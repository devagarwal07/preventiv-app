from __future__ import annotations

import json
import os
from typing import Any, Optional

from redis.asyncio import Redis

_redis: Optional[Redis] = None


async def get_redis() -> Redis:
    global _redis
    if _redis is not None:
        return _redis

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    _redis = Redis.from_url(redis_url, decode_responses=True)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None


async def cache_get_json(key: str) -> Optional[dict[str, Any]]:
    client = await get_redis()
    raw = await client.get(key)
    if not raw:
        return None
    return json.loads(raw)


async def cache_set_json(key: str, value: dict[str, Any], ttl_seconds: int) -> None:
    client = await get_redis()
    await client.set(key, json.dumps(value, default=str), ex=ttl_seconds)
