from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

import asyncpg

_pool: Optional[asyncpg.Pool] = None


async def init_db_pool() -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        return _pool

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required for AI engine")

    _pool = await asyncpg.create_pool(
        database_url,
        min_size=1,
        max_size=5,
        ssl="require"
    )
    return _pool


async def close_db_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_connection() -> AsyncIterator[asyncpg.Connection]:
    pool = await init_db_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)


async def fetch(query: str, *args: Any) -> list[asyncpg.Record]:
    async with get_connection() as conn:
        return await conn.fetch(query, *args)


async def fetchrow(query: str, *args: Any) -> Optional[asyncpg.Record]:
    async with get_connection() as conn:
        return await conn.fetchrow(query, *args)


async def execute(query: str, *args: Any) -> str:
    async with get_connection() as conn:
        return await conn.execute(query, *args)
