from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, Response

from models.anomaly_detector import anomaly_detector
from models.insight_generator import insight_generator
from models.risk_scorer import risk_scorer
from models.trend_analyzer import insight_template_engine, pattern_detector, trend_analyzer
from schemas.vitals import AnomalyDetectRequest, AnomalyDetectResponse, InsightsResponse
from utils.cache import cache_get_json, cache_set_json
from utils.db import execute, fetch, fetchrow
from utils.normalization import extract_numeric, mean
from utils.security import validate_service_key

router = APIRouter(prefix="/ai", tags=["anomaly", "insights"])


@router.post("/anomaly-detect", response_model=AnomalyDetectResponse, dependencies=[Depends(validate_service_key)])
async def anomaly_detect(payload: AnomalyDetectRequest):
    from_30 = datetime.now(timezone.utc) - timedelta(days=30)

    rows = await fetch(
        """
        SELECT value
        FROM vitals
        WHERE patient_id = $1
          AND type = $2
          AND recorded_at >= $3
        ORDER BY recorded_at DESC
        """,
        payload.patient_id,
        payload.type,
        from_30,
    )

    baseline_values: List[float] = []
    for row in rows:
        numeric = extract_numeric(payload.type, dict(row["value"] or {}))
        if numeric is not None:
            baseline_values.append(numeric)

    result = anomaly_detector.detect(payload.type, payload.value, baseline_values)
    return AnomalyDetectResponse(**result)


@router.post("/insights/{patient_id}", response_model=InsightsResponse, dependencies=[Depends(validate_service_key)])
async def generate_insights(patient_id: str):
    now = datetime.now(timezone.utc)
    rows = await fetch(
        """
        SELECT type, value, recorded_at
        FROM vitals
        WHERE patient_id = $1
          AND recorded_at >= $2
        ORDER BY recorded_at DESC
        """,
        patient_id,
        now - timedelta(days=14),
    )

    bp_values_5d: List[float] = []
    bp_values_prev_5d: List[float] = []
    sleep_debt_nights = 0
    steps_7d: List[float] = []
    steps_prev_7d: List[float] = []
    fasting_high_count = 0

    for row in rows:
        vtype = str(row["type"])
        value = dict(row["value"] or {})
        ts = row["recorded_at"]

        if vtype == "bp":
            bp = extract_numeric("bp", value)
            if bp is not None:
                if ts >= now - timedelta(days=5):
                    bp_values_5d.append(bp)
                elif now - timedelta(days=10) <= ts < now - timedelta(days=5):
                    bp_values_prev_5d.append(bp)

        if vtype == "sleep":
            quality = extract_numeric("sleep", value)
            if quality is not None and quality < 60:
                sleep_debt_nights += 1

        if vtype == "steps":
            step = extract_numeric("steps", value)
            if step is not None:
                if ts >= now - timedelta(days=7):
                    steps_7d.append(step)
                elif now - timedelta(days=14) <= ts < now - timedelta(days=7):
                    steps_prev_7d.append(step)

        if vtype == "glucose":
            g = extract_numeric("glucose", value)
            context = str(value.get("context") or "").lower()
            if g is not None and "fasting" in context and g > 126:
                fasting_high_count += 1

    bp_current = mean(bp_values_5d)
    bp_prev = mean(bp_values_prev_5d)
    bp_delta_percent = ((bp_current - bp_prev) / bp_prev * 100) if bp_prev > 0 else 0

    steps_current = mean(steps_7d)
    steps_previous = mean(steps_prev_7d)
    step_drop_percent = ((steps_previous - steps_current) / steps_previous * 100) if steps_previous > 0 else 0

    context = {
        "bp_delta_percent": bp_delta_percent,
        "sleep_debt_nights": sleep_debt_nights,
        "step_drop_percent": step_drop_percent,
        "fasting_high_count": fasting_high_count,
    }

    insights = insight_generator.generate(context)
    return InsightsResponse(insights=insights)


@router.post("/full-analysis/{patient_id}", dependencies=[Depends(validate_service_key)])
async def full_analysis(patient_id: str):
    cache_key = f"full-analysis:{patient_id}"
    cached = await cache_get_json(cache_key)
    if cached:
        computed_at_raw = cached.get("computed_at")
        if isinstance(computed_at_raw, str):
            try:
                computed_at = datetime.fromisoformat(computed_at_raw.replace("Z", "+00:00"))
                if computed_at >= datetime.now(timezone.utc) - timedelta(hours=6):
                    return Response(status_code=304)
            except ValueError:
                pass

    now = datetime.now(timezone.utc)
    from_30 = now - timedelta(days=30)
    from_14 = now - timedelta(days=14)

    vitals = await fetch(
        """
        SELECT type, value, recorded_at
        FROM vitals
        WHERE patient_id = $1
          AND recorded_at >= $2
        ORDER BY recorded_at ASC
        """,
        patient_id,
        from_30,
    )

    baseline_row = await fetchrow(
        """
        SELECT p.dob, pb.lifestyle
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN patient_baselines pb ON pb.patient_id = u.id
        WHERE u.id = $1
        LIMIT 1
        """,
        patient_id,
    )

    dob = baseline_row["dob"] if baseline_row else None
    lifestyle = dict((baseline_row["lifestyle"] if baseline_row else {}) or {})
    age = int((now.date() - dob).days / 365.25) if dob else 0
    smoking = bool(lifestyle.get("smoking", False))
    exercise_frequency = 0
    exercise_raw = lifestyle.get("exercise_frequency")
    if exercise_raw is not None:
        text = str(exercise_raw)
        for part in text.replace("/", " ").replace("-", " ").split():
            if part.isdigit():
                exercise_frequency = int(part)
                break

    bp_values: List[float] = []
    bp_records: List[Dict[str, Any]] = []
    hr_values: List[float] = []
    glucose_fasting: List[float] = []
    glucose_post: List[float] = []
    steps_last_7d: List[float] = []
    steps_prev_7d: List[float] = []
    steps_records: List[Dict[str, Any]] = []
    sleep_quality: List[float] = []
    sleep_duration_minutes: List[float] = []
    sleep_records: List[Dict[str, Any]] = []

    latest_by_type: Dict[str, Dict[str, Any]] = {}
    timeline_by_type: Dict[str, Dict[str, List[Any]]] = {}

    for row in vitals:
        vtype = str(row["type"])
        val = dict(row["value"] or {})
        ts = row["recorded_at"]

        latest_by_type[vtype] = {"type": vtype, "value": val, "recorded_at": ts}
        timeline_by_type.setdefault(vtype, {"values": [], "timestamps": []})

        numeric = extract_numeric(vtype, val)
        if numeric is not None:
            timeline_by_type[vtype]["values"].append(float(numeric))
            timeline_by_type[vtype]["timestamps"].append(ts)

        if vtype == "bp":
            systolic = extract_numeric("bp", val)
            if systolic is not None:
                bp_values.append(systolic)
                bp_records.append({"systolic": systolic, "recorded_at": ts.isoformat()})
        elif vtype == "hr":
            h = extract_numeric("hr", val)
            if h is not None:
                hr_values.append(h)
        elif vtype == "glucose":
            g = extract_numeric("glucose", val)
            context = str(val.get("context") or "").lower()
            if g is not None:
                if "fasting" in context:
                    glucose_fasting.append(g)
                elif "post" in context:
                    glucose_post.append(g)
        elif vtype == "steps":
            s = extract_numeric("steps", val)
            if s is not None:
                steps_records.append({"count": s, "recorded_at": ts.isoformat()})
                if ts >= now - timedelta(days=7):
                    steps_last_7d.append(s)
                elif now - timedelta(days=14) <= ts < now - timedelta(days=7):
                    steps_prev_7d.append(s)
        elif vtype == "sleep":
            q = extract_numeric("sleep", val)
            if q is not None:
                sleep_quality.append(q)
                sleep_records.append({"quality_score": q, "recorded_at": ts.isoformat()})
            dm = val.get("duration_minutes")
            try:
                if dm is not None:
                    sleep_duration_minutes.append(float(dm))
            except (TypeError, ValueError):
                pass

    latest_lab = await fetchrow(
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
    if latest_lab:
        extracted = dict(latest_lab["extracted_data"] or {})
        try:
            hba1c = float(extracted.get("hba1c") or 0)
        except (TypeError, ValueError):
            hba1c = 0.0

    cardio_score, cardio_explanations = risk_scorer.score_cardiovascular(
        mean(bp_values), mean(hr_values), hba1c, age, smoking, exercise_frequency
    )
    glycemic_score, glycemic_explanations = risk_scorer.score_glycemic(glucose_fasting, glucose_post, hba1c)
    lifestyle_score, lifestyle_explanations = risk_scorer.score_lifestyle(
        steps_last_7d, steps_prev_7d, sleep_quality, sleep_duration_minutes
    )

    risk_scores = {
        "cardiovascular": cardio_score,
        "glycemic": glycemic_score,
        "lifestyle": lifestyle_score,
    }
    explanations = {
        "cardiovascular": cardio_explanations,
        "glycemic": glycemic_explanations,
        "lifestyle": lifestyle_explanations,
    }

    for category, score in risk_scores.items():
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

    trend_analysis: Dict[str, Dict[str, Any]] = {}
    for vital_type, points in timeline_by_type.items():
        trend = trend_analyzer.compute_trend(points["values"], points["timestamps"])
        trend_analysis[vital_type] = {
            "direction": trend.direction,
            "slope": trend.slope,
            "r_squared": trend.r_squared,
            "change_percent_7d": trend.change_percent_7d,
            "change_percent_30d": trend.change_percent_30d,
        }

    anomalies: List[Dict[str, Any]] = []
    for vtype, latest in latest_by_type.items():
        baseline_values = timeline_by_type.get(vtype, {}).get("values", [])
        detected = anomaly_detector.detect(vtype, latest["value"], baseline_values)
        if detected["is_anomaly"]:
            anomalies.append({
                "type": vtype,
                "severity": detected["severity"],
                "explanation": detected["explanation"],
            })

    sleep_debt = pattern_detector.detect_consecutive_nights_poor_sleep(sleep_records)
    elevated_bp = pattern_detector.detect_elevated_bp_days(bp_records)
    step_deficit = pattern_detector.detect_step_deficit_week(steps_records)

    bp_change = trend_analysis.get("bp", {}).get("change_percent_7d", 0.0)
    step_decline = max(0.0, float(step_deficit.get("deficit_percent", 0.0)))

    template_insights = insight_template_engine.generate_insights(
        patient_id,
        {
            "bp_change_7d": bp_change,
            "poor_sleep_nights": 3 if sleep_debt else 0,
            "avg_sleep_hours": (mean(sleep_duration_minutes) / 60) if sleep_duration_minutes else 0,
            "steps_decline": step_decline,
            "post_meal_spikes": len([x for x in glucose_post if x > 180]),
            "step_drop_percent": step_decline,
            "fasting_high_count": len([x for x in glucose_fasting if x > 126]),
        },
        baseline={"exercise_frequency": exercise_frequency, "smoking": smoking},
    )

    payload = {
        "patient_id": patient_id,
        "computed_at": now.isoformat(),
        "risk_scores": risk_scores,
        "risk_explanations": explanations,
        "trends": trend_analysis,
        "anomalies": anomalies,
        "patterns": {
            "sleep_debt": sleep_debt,
            "elevated_bp": elevated_bp,
            "step_deficit": step_deficit,
        },
        "insights": template_insights,
    }

    await cache_set_json(cache_key, payload, ttl_seconds=6 * 60 * 60)
    return JSONResponse(content=payload)
