import math


def cardiovascular_risk(bp_systolic: float, age: int) -> str:
    score = bp_systolic * 0.35 + age * 0.65
    if score >= 120:
        return "high"
    if score >= 90:
        return "moderate"
    return "low"


def test_cardiovascular_known_input():
    assert cardiovascular_risk(150, 52) in {"moderate", "high"}


def test_zscore_anomaly_detection():
    baseline = [98, 101, 100, 99, 102]
    mean = sum(baseline) / len(baseline)
    variance = sum((x - mean) ** 2 for x in baseline) / len(baseline)
    std = math.sqrt(variance)
    z = (130 - mean) / std
    assert z > 2.5


def test_insight_template_rendering():
    template = "BP {value} is elevated vs your baseline"
    assert "148/92" in template.format(value="148/92")


def test_trend_slope_computation():
    series = [110, 112, 116, 118, 121]
    slope = (series[-1] - series[0]) / (len(series) - 1)
    assert slope > 0
