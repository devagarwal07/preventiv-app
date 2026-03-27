from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from routers.anomaly import router as anomaly_router
from routers.risk import router as risk_router
from utils.cache import close_redis
from utils.db import close_db_pool, init_db_pool


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db_pool()
    yield
    await close_redis()
    await close_db_pool()


app = FastAPI(title="Prevntiv AI Engine", version="0.1.0", lifespan=lifespan)

app.include_router(risk_router)
app.include_router(anomaly_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
