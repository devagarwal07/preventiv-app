"use client";

import { useState } from "react";
import { DateRangePicker, VitalsLineChart, VitalsSummaryGrid, type Vital } from "@prevntiv/ui-components";
import { Card } from "@/components/ui/primitives";

const demoVitals: Vital[] = [
    { type: "bp", value: { systolic: 122, diastolic: 82 }, recorded_at: new Date(Date.now() - 6 * 86400000).toISOString(), source: "manual" },
    { type: "bp", value: { systolic: 127, diastolic: 85 }, recorded_at: new Date(Date.now() - 4 * 86400000).toISOString(), source: "wearable" },
    { type: "bp", value: { systolic: 138, diastolic: 90 }, recorded_at: new Date(Date.now() - 2 * 86400000).toISOString(), source: "manual", is_anomaly: true },
    { type: "bp", value: { systolic: 132, diastolic: 86 }, recorded_at: new Date().toISOString(), source: "manual" }
];

export default function PatientVitalsPage() {
    const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex items-center justify-between">
                    <h3 className="font-heading text-lg">Vitals Trend</h3>
                    <DateRangePicker value={range} onRangeChange={({ range: r }) => setRange(r)} />
                </div>
                <div className="mt-3">
                    <VitalsLineChart data={demoVitals} vitalType="bp" baseline={120} dateRange={range} />
                </div>
            </Card>

            <VitalsSummaryGrid
                summary={{
                    bp: { currentValue: 132, unit: "mmHg", trend: "up", changePercent: 3.8, status: "borderline" },
                    glucose: { currentValue: 110, unit: "mg/dL", trend: "stable", changePercent: 0.5, status: "normal" },
                    hr: { currentValue: 74, unit: "bpm", trend: "down", changePercent: -1.4, status: "normal" },
                    spo2: { currentValue: 96, unit: "%", trend: "stable", changePercent: 0.2, status: "normal" },
                    weight: { currentValue: 72.1, unit: "kg", trend: "up", changePercent: 1.1, status: "borderline" },
                    steps: { currentValue: 6450, unit: "steps", trend: "down", changePercent: -6.8, status: "abnormal" }
                }}
            />
        </div>
    );
}
