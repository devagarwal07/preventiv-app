from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


VitalType = Literal["bp", "glucose", "hr", "spo2", "weight", "steps", "hrv", "sleep", "temperature"]


class VitalReading(BaseModel):
    type: VitalType
    value: Dict[str, Any]
    timestamp: datetime


class AnomalyDetectRequest(BaseModel):
    patient_id: str
    type: VitalType
    value: Dict[str, Any]


class AnomalyDetectResponse(BaseModel):
    is_anomaly: bool
    severity: Literal["low", "medium", "critical"]
    explanation: str


class InsightItem(BaseModel):
    message: str
    category: Literal["cardiovascular", "glycemic", "lifestyle"]
    severity: Literal["low", "medium", "high"]
    data_points: Dict[str, Any] = Field(default_factory=dict)


class InsightsResponse(BaseModel):
    insights: List[InsightItem]
