from __future__ import annotations

import os

from fastapi import Header, HTTPException, status


async def validate_service_key(x_service_key: str = Header(default="")) -> None:
    expected = os.getenv("AI_ENGINE_SERVICE_KEY") or os.getenv("INTERNAL_SERVICE_KEY") or "dev-internal-key"
    if x_service_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service key",
        )
