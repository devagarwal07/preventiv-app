from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal

from pydantic import BaseModel, Field


RiskCategory = Literal["cardiovascular", "glycemic", "lifestyle"]
RiskLevel = Literal["low", "moderate", "high"]


class RiskScoreItem(BaseModel):
    category: RiskCategory
    score: RiskLevel


class RiskScoreResponse(BaseModel):
    patient_id: str
    scores: List[RiskScoreItem]
    computed_at: datetime
    explanations: Dict[RiskCategory, List[str]] = Field(default_factory=dict)
