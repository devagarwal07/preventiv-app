from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal

from schemas.risk import RiskScoreItem
from utils import normalization

RiskLevel = Literal["low", "moderate", "high"]


class RiskScorer:
    def _risk_level_from_points(self, points: int) -> RiskLevel:
        if points <= 3:
            return "low"
        if points <= 7:
            return "moderate"
        return "high"

    def score_cardiovascular(
        self,
        avg_systolic: float,
        avg_hr: float,
        hba1c: float,
        age: int,
        smoking: bool,
        exercise_frequency: int,
    ) -> tuple[RiskLevel, List[str]]:
        points = 0
        explanations: List[str] = []

        if avg_systolic >= 140:
            points += 3
            explanations.append("Average systolic BP is >= 140")
        elif avg_systolic >= 130:
            points += 2
            explanations.append("Average systolic BP is between 130-139")
        elif avg_systolic >= 120:
            points += 1
            explanations.append("Average systolic BP is between 120-129")

        if avg_hr > 100:
            points += 2
            explanations.append("Resting HR is > 100")
        elif avg_hr >= 80:
            points += 1
            explanations.append("Resting HR is between 80-100")

        if hba1c > 6.5:
            points += 3
            explanations.append("HbA1c is > 6.5")
        elif hba1c >= 5.7:
            points += 2
            explanations.append("HbA1c is between 5.7 and 6.5")

        if age > 50:
            points += 2
            explanations.append("Age is above 50")
        elif age >= 40:
            points += 1
            explanations.append("Age is between 40 and 50")

        if smoking:
            points += 3
            explanations.append("Smoking increases cardiovascular risk")

        if exercise_frequency < 2:
            points += 2
            explanations.append("Exercise frequency is below 2 sessions/week")

        return self._risk_level_from_points(points), explanations

    def score_glycemic(self, fasting_values: List[float], post_meal_values: List[float], hba1c: float) -> tuple[RiskLevel, List[str]]:
        explanations: List[str] = []

        all_glucose = fasting_values + post_meal_values
        avg_fasting = normalization.mean(fasting_values)

        if not all_glucose:
            return "low", ["Insufficient glucose readings; defaulting to low risk"]

        mean_val = normalization.mean(all_glucose)
        variance = normalization.mean([(x - mean_val) ** 2 for x in all_glucose])
        std_dev = variance ** 0.5
        cv = (std_dev / mean_val * 100) if mean_val else 0

        if cv > 36:
            explanations.append("Glucose coefficient of variation is above 36%")
            return "high", explanations

        if avg_fasting > 126 or hba1c > 6.5:
            explanations.append("Fasting glucose average is above 126 or HbA1c is high")
            return "high", explanations

        if avg_fasting >= 100 or hba1c >= 5.7:
            explanations.append("Fasting glucose average is in prediabetic range")
            return "moderate", explanations

        explanations.append("Glucose stability is within expected range")
        return "low", explanations

    def score_lifestyle(
        self,
        steps_last_7d: List[float],
        steps_prev_7d: List[float],
        sleep_quality: List[float],
        sleep_duration_minutes: List[float],
    ) -> tuple[RiskLevel, List[str]]:
        points = 0
        explanations: List[str] = []

        last_avg = normalization.mean(steps_last_7d)
        prev_avg = normalization.mean(steps_prev_7d)
        if prev_avg > 0:
            decline = ((prev_avg - last_avg) / prev_avg) * 100
            if decline > 20:
                points += 2
                explanations.append("Steps declined more than 20% compared to previous week")

        sq_avg = normalization.mean(sleep_quality)
        if sq_avg and sq_avg < 60:
            points += 2
            explanations.append("Average sleep quality below 60")

        sleep_hours = normalization.mean(sleep_duration_minutes) / 60 if sleep_duration_minutes else 0
        if sleep_hours and sleep_hours < 6:
            points += 2
            explanations.append("Average sleep duration below 6 hours")

        return self._risk_level_from_points(points), explanations

    def build_response(self, patient_id: str, scores: Dict[str, RiskLevel], explanations: Dict[str, List[str]]) -> Dict[str, Any]:
        return {
            "patient_id": patient_id,
            "scores": [RiskScoreItem(category=category, score=score).model_dump() for category, score in scores.items()],
            "computed_at": datetime.now(timezone.utc),
            "explanations": explanations,
        }


risk_scorer = RiskScorer()
