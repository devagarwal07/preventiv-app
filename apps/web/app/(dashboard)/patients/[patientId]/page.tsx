"use client";

import { useMemo, useState } from "react";
import {
    DateRangePicker,
    RiskScoreGauge,
    VitalsLineChart,
    VitalsSummaryGrid,
    type Vital,
    type VitalsSummary
} from "@prevntiv/ui-components";
import { Badge, Button, Card, Skeleton, Tabs } from "@/components/ui/primitives";
import { useCarePlans, useLabs, usePatientEHR, useVitals } from "@/lib/hooks";

export default function PatientProfilePage({ params }: { params: { patientId: string } }) {
    const [tab, setTab] = useState("vitals");
    const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
    const [insightsOpen, setInsightsOpen] = useState(true);

    const ehr = usePatientEHR(params.patientId);
    const vitals = useVitals(params.patientId, { range });
    const labs = useLabs(params.patientId);
    const carePlans = useCarePlans(params.patientId);

    if (ehr.isLoading || vitals.isLoading || labs.isLoading || carePlans.isLoading) {
        return <Skeleton className="h-[620px] w-full" />;
    }

    const profile = (ehr.data || {}) as Record<string, unknown>;
    const vitalRows = (Array.isArray(vitals.data) ? vitals.data : []) as unknown as Vital[];
    const labsRows = (Array.isArray(labs.data) ? labs.data : []) as Array<Record<string, unknown>>;
    const careRows = (Array.isArray(carePlans.data) ? carePlans.data : []) as Array<Record<string, unknown>>;

    const latestSummary = useMemo<VitalsSummary>(
        () => ({
            bp: { currentValue: 132, unit: "mmHg", trend: "up", changePercent: 4.2, status: "borderline" },
            glucose: { currentValue: 118, unit: "mg/dL", trend: "stable", changePercent: 0.8, status: "normal" },
            hr: { currentValue: 74, unit: "bpm", trend: "down", changePercent: -2.1, status: "normal" },
            spo2: { currentValue: 95, unit: "%", trend: "stable", changePercent: 0.1, status: "normal" },
            weight: { currentValue: 72.4, unit: "kg", trend: "up", changePercent: 1.9, status: "borderline" },
            steps: { currentValue: 6542, unit: "steps", trend: "down", changePercent: -8.4, status: "abnormal" }
        }),
        []
    );

    return (
        <div className="grid gap-4 xl:grid-cols-[30%_1fr]">
            <div className="space-y-4">
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-secondary" />
                        <div>
                            <p className="font-heading text-xl">{String(profile.name || "Patient")}</p>
                            <p className="text-xs text-ink/65">Age {String(profile.age || "--")} · Blood {String(profile.blood_type || "--")}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                        {["diabetes", "hypertension"].map((x) => (
                            <Badge key={x} tone="moderate">{x}</Badge>
                        ))}
                    </div>
                    <div className="mt-3 text-sm text-ink/75">Medications: Metformin, Telmisartan</div>
                    <div className="mt-2 text-sm text-ink/75">Care plans: {careRows.length}</div>
                    <div className="mt-4 grid gap-2">
                        <Button>Create Care Plan</Button>
                        <Button>Book Appointment</Button>
                        <Button>Send Alert</Button>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <h3 className="font-heading text-lg">AI Insights</h3>
                        <button className="text-xs text-primary underline" onClick={() => setInsightsOpen((v) => !v)}>
                            {insightsOpen ? "Collapse" : "Expand"}
                        </button>
                    </div>
                    {insightsOpen ? (
                        <div className="mt-3 space-y-3">
                            <RiskScoreGauge category="cardiovascular" score="moderate" trend="up" />
                            <RiskScoreGauge category="glycemic" score="low" trend="stable" />
                            <RiskScoreGauge category="lifestyle" score="high" trend="up" />
                            <div className="flex flex-wrap gap-1">
                                <Badge tone="high">BP trending upward</Badge>
                                <Badge tone="moderate">Sleep debt</Badge>
                            </div>
                            <Button>Refresh Analysis</Button>
                        </div>
                    ) : null}
                </Card>
            </div>

            <div className="space-y-4">
                <Tabs
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: "vitals", label: "Vitals" },
                        { value: "labs", label: "Labs" },
                        { value: "care-plans", label: "Care Plans" },
                        { value: "consultations", label: "Consultations" },
                        { value: "alerts", label: "Alerts" }
                    ]}
                />

                {tab === "vitals" ? (
                    <Card>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-heading text-lg">Vitals</h3>
                            <DateRangePicker
                                value={range}
                                onRangeChange={({ range: r }) => setRange(r)}
                            />
                        </div>
                        <div className="mt-3"><VitalsLineChart data={vitalRows} vitalType="bp" baseline={120} dateRange={range} /></div>
                        <div className="mt-3"><VitalsSummaryGrid summary={latestSummary} /></div>
                        <div className="mt-3 overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead><tr className="text-left text-ink/60"><th>Date</th><th>Type</th><th>Value</th></tr></thead>
                                <tbody>
                                    {vitalRows.slice(0, 8).map((v, idx) => (
                                        <tr key={`vr-${idx}`} className="border-t border-fog"><td>{new Date(v.recorded_at).toLocaleString()}</td><td>{v.type}</td><td>{JSON.stringify(v.value)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : null}

                {tab === "labs" ? (
                    <Card>
                        <h3 className="font-heading text-lg">Lab Reports</h3>
                        <div className="mt-3 space-y-2">
                            {labsRows.slice(0, 8).map((lab, idx) => (
                                <div key={`lab-${idx}`} className="rounded-soft border border-fog p-3">
                                    <p className="text-sm">Report #{String(lab.id || idx)}</p>
                                    <a className="text-xs text-primary underline" href={String(lab.signed_url || "#")}>View PDF</a>
                                </div>
                            ))}
                        </div>
                    </Card>
                ) : null}

                {tab === "care-plans" ? (
                    <Card>
                        <div className="flex items-center justify-between">
                            <h3 className="font-heading text-lg">Care Plans</h3>
                            <Button>Create new care plan</Button>
                        </div>
                        <div className="mt-3 space-y-2">
                            {careRows.slice(0, 6).map((plan, idx) => (
                                <div key={`cp-${idx}`} className="rounded-soft border border-fog p-3">
                                    <p className="text-sm font-medium">{String(plan.title || `Care plan ${idx + 1}`)}</p>
                                    <div className="mt-2 h-2 rounded-full bg-secondary"><div className="h-full w-2/3 rounded-full bg-primary" /></div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ) : null}

                {tab === "consultations" ? (
                    <Card><p className="text-sm text-ink/70">Recent consultations and encrypted notes history.</p></Card>
                ) : null}

                {tab === "alerts" ? (
                    <Card><p className="text-sm text-ink/70">Latest patient alerts with deep links to vitals.</p></Card>
                ) : null}
            </div>
        </div>
    );
}
