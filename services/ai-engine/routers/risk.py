from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from models.risk_scorer import risk_scorer
from schemas.risk import RiskScoreResponse
from utils.db import execute, fetch, fetchrow
from utils.normalization import extract_numeric, mean
from utils.security import validate_service_key

router = APIRouter(prefix="/ai", tags=["risk"])


def _to_int_weekly_exercise(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, int):
        return value
    text = str(value)
    for part in text.replace("/", " ").replace("-", " ").split():
        if part.isdigit():
            return int(part)
    return 0


@router.post("/risk-score/{patient_id}", response_model=RiskScoreResponse, dependencies=[Depends(validate_service_key)])
async def compute_risk_score(patient_id: str):
    now = datetime.now(timezone.utc)
    from_30 = now - timedelta(days=30)
    from_14 = now - timedelta(days=14)

    baseline = await fetchrow(
        """
        SELECT u.id, p.dob, pb.lifestyle, pb.medications, pb.chronic_conditions
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN patient_baselines pb ON pb.patient_id = u.id
        WHERE u.id = $1
        LIMIT 1
        """,
        patient_id,
    )

    vitals = await fetch(
        """
        SELECT type, value, recorded_at
        FROM vitals
        WHERE patient_id = $1 AND recorded_at >= $2
        ORDER BY recorded_at DESC
        """,
        patient_id,
        from_30,
    )

    if baseline is None:
        response = risk_scorer.build_response(
            patient_id,
            {"cardiovascular": "low", "glycemic": "low", "lifestyle": "low"},
            {
                "cardiovascular": ["Patient baseline not found"],
                "glycemic": ["Patient baseline not found"],
                "lifestyle": ["Patient baseline not found"],
            },
        )
        return response

    bp_values: List[float] = []
    hr_values: List[float] = []
    fasting_glucose: List[float] = []
    post_meal_glucose: List[float] = []
    steps_last_7d: List[float] = []
    steps_prev_7d: List[float] = []
    sleep_quality: List[float] = []
    sleep_duration_minutes: List[float] = []

    for row in vitals:
        vital_type = str(row["type"])
        value = dict(row["value"] or {})
        numeric = extract_numeric(vital_type, value)
        recorded_at = row["recorded_at"]

        if vital_type == "bp" and numeric is not None:
            bp_values.append(numeric)
        elif vital_type == "hr" and numeric is not None:
            hr_values.append(numeric)
        elif vital_type == "glucose" and numeric is not None:
            context = str(value.get("context") or "").lower()
            if "fasting" in context:
                fasting_glucose.append(numeric)
            elif "post" in context:
                post_meal_glucose.append(numeric)
        elif vital_type == "steps" and numeric is not None:
            if recorded_at >= now - timedelta(days=7):
                steps_last_7d.append(numeric)
            elif now - timedelta(days=14) <= recorded_at < now - timedelta(days=7):
                steps_prev_7d.append(numeric)
        elif vital_type == "sleep":
            q = extract_numeric("sleep", value)
            dur = value.get("duration_minutes")
            if q is not None:
                sleep_quality.append(q)
            try:
                if dur is not None:
                    sleep_duration_minutes.append(float(dur))
            except (TypeError, ValueError):
                pass

    extracted_hba1c = await fetchrow(
        """
        SELECT extracted_data
        FROM lab_reports
        WHERE patient_id = $1
        ORDER BY uploaded_at DESC
        LIMIT 1
        """,
        patient_id,
    )

    hba1c = 0.0
    if extracted_hba1c:
        extracted = dict(extracted_hba1c["extracted_data"] or {})
        try:
            hba1c = float(extracted.get("hba1c") or 0)
        except (TypeError, ValueError):
            hba1c = 0.0

    dob = baseline["dob"]
    age = 0
    if dob:
        age = int((now.date() - dob).days / 365.25)

    lifestyle = dict(baseline["lifestyle"] or {})
    smoking = bool(lifestyle.get("smoking", False))
    exercise_frequency = _to_int_weekly_exercise(lifestyle.get("exercise_frequency"))

    cardio_score, cardio_explanations = risk_scorer.score_cardiovascular(
        mean(bp_values), mean(hr_values), hba1c, age, smoking, exercise_frequency
    )
    glycemic_score, glycemic_explanations = risk_scorer.score_glycemic(
        fasting_glucose, post_meal_glucose, hba1c
    )
    lifestyle_score, lifestyle_explanations = risk_scorer.score_lifestyle(
        steps_last_7d, steps_prev_7d, sleep_quality, sleep_duration_minutes
    )

    scores = {
        "cardiovascular": cardio_score,
        "glycemic": glycemic_score,
        "lifestyle": lifestyle_score,
    }
    explanations = {
        "cardiovascular": cardio_explanations,
        "glycemic": glycemic_explanations,
        "lifestyle": lifestyle_explanations,
    }

    for category, score in scores.items():
        await execute(
            """
            INSERT INTO risk_scores (patient_id, category, score, computed_at, explanation)
            VALUES ($1, $2, $3, NOW(), $4::jsonb)
            """,
            patient_id,
            category,
            score,
            explanations[category],
        )

    return risk_scorer.build_response(patient_id, scores, explanations)
