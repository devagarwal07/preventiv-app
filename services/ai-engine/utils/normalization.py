from __future__ import annotations

from typing import Any, Dict, Iterable, Optional


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def mean(values: Iterable[float]) -> float:
    seq = list(values)
    if not seq:
        return 0.0
    return sum(seq) / len(seq)


def extract_numeric(vital_type: str, value: Dict[str, Any]) -> Optional[float]:
    if vital_type == "bp":
        return _to_float(value.get("systolic"))
    if vital_type == "hr":
        return _to_float(value.get("bpm"))
    if vital_type == "spo2":
        return _to_float(value.get("percent"))
    if vital_type == "weight":
        return _to_float(value.get("kg")) or _to_float(value.get("value"))
    if vital_type == "steps":
        return _to_float(value.get("count"))
    if vital_type == "hrv":
        return _to_float(value.get("ms"))
    if vital_type == "sleep":
        return _to_float(value.get("quality_score"))
    if vital_type == "glucose":
        val = _to_float(value.get("value"))
        unit = str(value.get("unit") or "mg/dL")
        if val is None:
            return None
        if unit == "mmol/L":
            return val * 18
        return val
    if vital_type == "temperature":
        val = _to_float(value.get("value"))
        unit = str(value.get("unit") or "C")
        if val is None:
            return None
        return (val - 32) * 5 / 9 if unit == "F" else val
    return _to_float(value.get("value"))
