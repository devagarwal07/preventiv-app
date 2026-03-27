from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Literal

import numpy as np

Direction = Literal[
    "rapidly_increasing",
    "slowly_increasing",
    "stable",
    "slowly_decreasing",
    "rapidly_decreasing",
]


@dataclass
class TrendResult:
    direction: Direction
    slope: float
    r_squared: float
    change_percent_7d: float
    change_percent_30d: float


class TrendAnalyzer:
    def compute_trend(self, values: List[float], timestamps: List[datetime]) -> TrendResult:
        if len(values) < 2 or len(values) != len(timestamps):
            return TrendResult(
                direction="stable",
                slope=0.0,
                r_squared=0.0,
                change_percent_7d=0.0,
                change_percent_30d=0.0,
            )

        t0 = timestamps[0]
        x = np.array([(ts - t0).total_seconds() / 86400 for ts in timestamps], dtype=float)
        y = np.array(values, dtype=float)

        slope, intercept = np.polyfit(x, y, 1)
        y_pred = slope * x + intercept

        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0

        change_percent_7d = self._change_percent(values, 7)
        change_percent_30d = self._change_percent(values, 30)

        direction: Direction
        abs_slope = abs(float(slope))
        if abs_slope < 0.05:
            direction = "stable"
        elif slope > 0:
            direction = "rapidly_increasing" if abs_slope >= 0.8 else "slowly_increasing"
        else:
            direction = "rapidly_decreasing" if abs_slope >= 0.8 else "slowly_decreasing"

        return TrendResult(
            direction=direction,
            slope=float(slope),
            r_squared=r_squared,
            change_percent_7d=change_percent_7d,
            change_percent_30d=change_percent_30d,
        )

    def _change_percent(self, values: List[float], days_like_window: int) -> float:
        if len(values) < 2:
            return 0.0

        window = min(len(values), max(2, days_like_window))
        first = float(values[-window])
        last = float(values[-1])
        if first == 0:
            return 0.0
        return float(((last - first) / abs(first)) * 100)


class ConsecutivePatternDetector:
    def detect_consecutive_nights_poor_sleep(
        self,
        sleep_records: List[Dict[str, Any]],
        threshold: int = 60,
        min_consecutive: int = 3,
    ) -> bool:
        count = 0
        for record in sorted(sleep_records, key=lambda r: r.get("recorded_at", "")):
            quality = float(record.get("quality_score", 0))
            if quality < threshold:
                count += 1
                if count >= min_consecutive:
                    return True
            else:
                count = 0
        return False

    def detect_elevated_bp_days(
        self,
        bp_records: List[Dict[str, Any]],
        threshold: int = 130,
        min_days: int = 3,
    ) -> Dict[str, Any]:
        values = [float(r.get("systolic", 0)) for r in bp_records if r.get("systolic") is not None]
        elevated = [v for v in values if v >= threshold]
        return {
            "detected": len(elevated) >= min_days,
            "count": len(elevated),
            "avg_value": float(np.mean(elevated)) if elevated else 0.0,
        }

    def detect_step_deficit_week(
        self,
        step_records: List[Dict[str, Any]],
        patient_target: int = 8000,
    ) -> Dict[str, Any]:
        values = [float(r.get("count", 0)) for r in step_records]
        if not values:
            return {"detected": False, "avg_steps": 0.0, "deficit_percent": 0.0}

        avg_steps = float(np.mean(values))
        deficit = max(0.0, patient_target - avg_steps)
        deficit_percent = (deficit / patient_target) * 100 if patient_target else 0.0
        return {
            "detected": deficit_percent >= 20,
            "avg_steps": avg_steps,
            "deficit_percent": deficit_percent,
        }


class InsightTemplateEngine:
    TEMPLATES: Dict[str, str] = {
        "bp_trending_high": "Your average blood pressure has been {change:.1f}% higher than your baseline over the past {days} days.",
        "sleep_debt": "Sleep debt detected for {consecutive} consecutive nights. Average sleep duration is {avg:.1f}h, below your {target:.1f}h target.",
        "steps_declining": "Your daily step count has decreased by {percent:.1f}% compared to last week.",
        "glucose_spikes": "Post-meal glucose spikes detected on {count} occasions this week. Consider reviewing your diet.",
        "low_hrv": "Your HRV has been trending lower than baseline, which can indicate recovery stress.",
        "good_streak_bp": "Great news - your blood pressure has been within healthy range for {days} consecutive days.",
        "lab_due": "Based on your health profile, your next HbA1c check is recommended within {days} days.",
        "spo2_drop": "Several SpO2 readings dipped below your expected range this week.",
        "weight_gain": "Weight trend indicates a gain of {change:.1f}% over the past month.",
        "weight_loss": "Weight trend indicates a decrease of {change:.1f}% over the past month.",
        "high_resting_hr": "Your resting heart rate has remained above baseline for multiple days.",
        "great_steps": "Excellent activity streak - your average daily steps are above target this week.",
        "poor_sleep_quality": "Sleep quality score has been below 60 for multiple nights.",
        "hydration_prompt": "Consider improving hydration; your heart rate variability pattern suggests possible stress load.",
        "bp_variability": "Blood pressure variability is higher than usual; consistent monitoring is recommended.",
        "glucose_improved": "Your glucose trend is improving compared to the previous week.",
        "glucose_worsened": "Your glucose trend has worsened in the past week; discuss with your clinician.",
        "sedentary_pattern": "A sedentary pattern is detected this week. Short activity breaks can help.",
        "sleep_recovery": "Sleep recovery has improved over the last 3 nights - keep it up.",
        "rem_low": "REM sleep has been lower than expected recently.",
        "stress_signal": "Combined HR and sleep patterns suggest increased stress signal this week.",
    }

    def __init__(self) -> None:
        self._daily_dedup: set[str] = set()

    def generate_insights(
        self,
        patient_id: str,
        vitals_data: Dict[str, Any],
        baseline: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        generated: List[Dict[str, Any]] = []

        bp_change = float(vitals_data.get("bp_change_7d", 0.0))
        if bp_change > 10:
            generated.append(self._insight("bp_trending_high", "high", change=bp_change, days=7))

        sleep_consecutive = int(vitals_data.get("poor_sleep_nights", 0))
        if sleep_consecutive >= 3:
            generated.append(
                self._insight(
                    "sleep_debt",
                    "medium",
                    consecutive=sleep_consecutive,
                    avg=float(vitals_data.get("avg_sleep_hours", 0.0)),
                    target=7.0,
                )
            )

        step_decline = float(vitals_data.get("steps_decline", 0.0))
        if step_decline > 20:
            generated.append(self._insight("steps_declining", "medium", percent=step_decline))

        glucose_spikes = int(vitals_data.get("post_meal_spikes", 0))
        if glucose_spikes > 0:
            generated.append(self._insight("glucose_spikes", "high", count=glucose_spikes))

        if not generated:
            generated.append(self._insight("great_steps", "low"))

        unique: List[Dict[str, Any]] = []
        for item in generated:
            dedup_key = f"{patient_id}:{item['type']}"
            if dedup_key in self._daily_dedup:
                continue
            self._daily_dedup.add(dedup_key)
            unique.append(item)

        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        unique.sort(key=lambda i: severity_order.get(i["severity"], 99))
        return unique[:5]

    def _insight(self, template_key: str, severity: str, **kwargs: Any) -> Dict[str, Any]:
        message = self.TEMPLATES[template_key].format(**kwargs)
        return {
            "type": template_key,
            "message": message,
            "severity": severity,
            "category": self._category_for(template_key),
            "data_points": kwargs,
        }

    def _category_for(self, template_key: str) -> str:
        if "bp" in template_key or "hr" in template_key or "spo2" in template_key:
            return "cardiovascular"
        if "glucose" in template_key or "lab" in template_key:
            return "glycemic"
        return "lifestyle"


trend_analyzer = TrendAnalyzer()
pattern_detector = ConsecutivePatternDetector()
insight_template_engine = InsightTemplateEngine()
