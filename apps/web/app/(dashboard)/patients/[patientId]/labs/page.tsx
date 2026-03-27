"use client";

import { HealthTimeline } from "@prevntiv/ui-components";

export default function PatientLabsPage({ params }: { params: { patientId: string } }) {
    return (
        <HealthTimeline
            patientId={params.patientId}
            events={[
                { id: "e1", event_type: "lab_upload", summary: "Quarterly panel uploaded", occurred_at: new Date(Date.now() - 86400000).toISOString() },
                { id: "e2", event_type: "risk_score", summary: "Cardiovascular risk moved to moderate", occurred_at: new Date(Date.now() - 2 * 86400000).toISOString() },
                { id: "e3", event_type: "care_plan_update", summary: "Care plan action updated", occurred_at: new Date(Date.now() - 4 * 86400000).toISOString() }
            ]}
        />
    );
}
