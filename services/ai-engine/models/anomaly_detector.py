from __future__ import annotations

from typing import Any, Dict, Iterable, Literal, Optional

from utils import normalization

Severity = Literal["low", "medium", "critical"]


class AnomalyDetector:
    def _zscore(self, current: float, baseline_values: Iterable[float]) -> float:
        values = [v for v in baseline_values if v is not None]
        if len(values) < 5:
            return 0

        mean_val = normalization.mean(values)
        variance = normalization.mean([(x - mean_val) ** 2 for x in values])
        std_dev = variance ** 0.5
        if std_dev == 0:
            return 0
        return abs((current - mean_val) / std_dev)

    def detect(
        self,
        vital_type: str,
        value: Dict[str, Any],
        baseline_values: Iterable[float],
    ) -> Dict[str, Any]:
        if vital_type == "bp":
            systolic = normalization.extract_numeric("bp", value)
            if systolic is not None and (systolic > 180 or systolic < 80):
                return {
                    "is_anomaly": True,
                    "severity": "critical",
                    "explanation": f"Systolic BP {systolic} is in immediate alert range",
                }

        if vital_type == "hr":
            bpm = normalization.extract_numeric("hr", value)
            if bpm is not None and (bpm > 150 or bpm < 40):
                return {
                    "is_anomaly": True,
                    "severity": "critical",
                    "explanation": f"Heart rate {bpm} is in immediate alert range",
                }

        if vital_type == "spo2":
            spo2 = normalization.extract_numeric("spo2", value)
            if spo2 is not None and spo2 < 90:
                return {
                    "is_anomaly": True,
                    "severity": "critical",
                    "explanation": f"SpO2 {spo2}% is below critical threshold",
                }

        numeric_value = normalization.extract_numeric(vital_type, value)
        if numeric_value is None:
            return {
                "is_anomaly": False,
                "severity": "low",
                "explanation": "No numeric value available for anomaly detection",
            }

        z = self._zscore(numeric_value, baseline_values)
        if z > 2.5:
            severity: Severity = "medium" if z <= 3.5 else "critical"
            return {
                "is_anomaly": True,
                "severity": severity,
                "explanation": f"Reading deviates from personal baseline with z-score {z:.2f}",
            }

        return {
            "is_anomaly": False,
            "severity": "low",
            "explanation": "Reading is within personal baseline variation",
        }


anomaly_detector = AnomalyDetector()
