from __future__ import annotations

from typing import Any, Dict, List

from schemas.vitals import InsightItem


class InsightGenerator:
    def generate(self, context: Dict[str, Any]) -> List[InsightItem]:
        insights: List[InsightItem] = []

        bp_delta = context.get("bp_delta_percent")
        if bp_delta is not None and bp_delta > 10:
            insights.append(
                InsightItem(
                    message="Your average BP has been trending higher than your personal baseline over the past 5 days.",
                    category="cardiovascular",
                    severity="high",
                    data_points={"bp_delta_percent": bp_delta},
                )
            )

        sleep_debt_nights = context.get("sleep_debt_nights", 0)
        if sleep_debt_nights >= 4:
            insights.append(
                InsightItem(
                    message="Sleep debt detected for 4 consecutive nights.",
                    category="lifestyle",
                    severity="medium",
                    data_points={"sleep_debt_nights": sleep_debt_nights},
                )
            )

        step_drop_percent = context.get("step_drop_percent")
        if step_drop_percent is not None and step_drop_percent > 20:
            insights.append(
                InsightItem(
                    message="Your step count has dropped significantly compared to last week.",
                    category="lifestyle",
                    severity="medium",
                    data_points={"step_drop_percent": step_drop_percent},
                )
            )

        fasting_high_count = context.get("fasting_high_count", 0)
        if fasting_high_count >= 3:
            insights.append(
                InsightItem(
                    message="Multiple elevated fasting glucose readings were detected this week.",
                    category="glycemic",
                    severity="high",
                    data_points={"fasting_high_count": fasting_high_count},
                )
            )

        if not insights:
            insights.append(
                InsightItem(
                    message="No major negative trend detected. Keep tracking consistently.",
                    category="lifestyle",
                    severity="low",
                    data_points={},
                )
            )

        return insights[:5]


insight_generator = InsightGenerator()
