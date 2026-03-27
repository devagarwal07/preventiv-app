"use client";

import { AdherenceBar } from "@prevntiv/ui-components";

export default function PatientCarePlansPage() {
    return (
        <div className="space-y-3">
            <AdherenceBar
                carePlan={{
                    id: "cp-1",
                    title: "Cardio stabilization plan",
                    items: [
                        { id: "i1", action: "Morning BP log" },
                        { id: "i2", action: "20 min walk" }
                    ]
                }}
                adherenceData={{
                    last7dPercent: 71,
                    streakByItem: { i1: 6, i2: 3 }
                }}
            />
        </div>
    );
}
