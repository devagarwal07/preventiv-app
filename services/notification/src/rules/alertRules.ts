import { redis } from "../utils/redis";

export interface AlertRuleResult {
    code: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
}

const cooldownKey = (patientId: string, code: string) => `alert-cooldown:${patientId}:${code}`;

const shouldDedup = async (patientId: string, code: string, ttlSeconds: number): Promise<boolean> => {
    const key = cooldownKey(patientId, code);
    const existing = await redis.get(key);
    if (existing) return true;
    await redis.set(key, "1", "EX", ttlSeconds);
    return false;
};

export const evaluateVital = async (
    vital: { patientId: string; type: string; value: Record<string, unknown> },
    baseline: Record<string, unknown>,
    riskScores: Record<string, string>
): Promise<AlertRuleResult[]> => {
    const alerts: AlertRuleResult[] = [];

    if (vital.type === "bp") {
        const systolic = Number(vital.value.systolic || 0);
        if (systolic > 180 && !(await shouldDedup(vital.patientId, "CRITICAL_BP", 30 * 60))) {
            alerts.push({
                code: "CRITICAL_BP",
                severity: "critical",
                message: `Critical BP detected: systolic ${systolic}`
            });
        }
    }

    if (vital.type === "spo2") {
        const spo2 = Number(vital.value.percent || 0);
        if (spo2 < 90 && !(await shouldDedup(vital.patientId, "CRITICAL_SPO2", 30 * 60))) {
            alerts.push({
                code: "CRITICAL_SPO2",
                severity: "critical",
                message: `Critical SpO2 detected: ${spo2}%`
            });
        }
    }

    const highRisk = Object.values(riskScores).some((level) => level === "high");
    if (highRisk && !(await shouldDedup(vital.patientId, "HIGH_RISK_SCORE", 6 * 60 * 60))) {
        alerts.push({
            code: "HIGH_RISK_SCORE",
            severity: "high",
            message: "High risk score detected for at least one category"
        });
    }

    return alerts;
};
