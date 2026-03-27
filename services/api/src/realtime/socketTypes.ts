export interface ServerToClientEvents {
    "vital:added": (payload: { vital: unknown }) => void;
    "anomaly:detected": (payload: { anomaly: unknown; vital: unknown }) => void;
    "alert:new": (payload: { alert: unknown }) => void;
    "care-plan:updated": (payload: { carePlan: unknown }) => void;
    "lab-report:processed": (payload: { reportId: string; extractedData: unknown }) => void;
    "risk-score:updated": (payload: { riskScores: unknown }) => void;
    "follow-up:reminder": (payload: { appointment: unknown }) => void;
}

export interface ClientToServerEvents {
    "vital:submit": (payload: { type: string; value: Record<string, unknown>; timestamp: string }) => void;
    "notification:read": (payload: { notificationId: string }) => void;
}
