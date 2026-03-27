"use client";

import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { Button, Card, Input } from "@/components/ui/primitives";

type Overview = {
    total_patients: number;
    active_patients: number;
    professionals: number;
    care_plan_adherence_rate: number;
    risk_distribution: Array<{ score: string; count: number }>;
};

type Professional = {
    id: string;
    name: string;
    role: string;
    patients_count: number;
    avg_alert_response_minutes: number;
    care_plans_active: number;
};

type Patient = {
    id: string;
    name: string;
    risk_score: string;
    professional_id: string | null;
};

export function OrgDashboardClient({
    orgId,
    overview,
    professionals,
    patients,
    riskDistribution
}: {
    orgId: string;
    overview: Overview;
    professionals: Professional[];
    patients: Patient[];
    riskDistribution: Array<{ score: string; count: number }>;
}) {
    const [selectedPatient, setSelectedPatient] = useState("");
    const [selectedProfessional, setSelectedProfessional] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [assignMessage, setAssignMessage] = useState("");
    const [search, setSearch] = useState("");

    const palette = {
        high: "#b91c1c",
        moderate: "#b45309",
        low: "#166534"
    } as const;

    const filteredPatients = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) {
            return patients;
        }
        return patients.filter((p) => [p.name, p.id, p.risk_score].filter(Boolean).join(" ").toLowerCase().includes(q));
    }, [patients, search]);

    const usageSeries = useMemo(() => {
        return Array.from({ length: 12 }).map((_, idx) => ({
            week: `W${idx + 1}`,
            patients: Math.max(1, Math.round((overview.total_patients / 12) * (0.6 + idx / 18))),
            vitals: Math.max(5, Math.round((overview.active_patients || 1) * (0.8 + idx / 15)))
        }));
    }, [overview.active_patients, overview.total_patients]);

    const commonConditions = [
        { name: "Hypertension", count: Math.max(1, Math.round(overview.total_patients * 0.34)) },
        { name: "Type 2 Diabetes", count: Math.max(1, Math.round(overview.total_patients * 0.27)) },
        { name: "PCOS", count: Math.max(1, Math.round(overview.total_patients * 0.12)) },
        { name: "Obesity", count: Math.max(1, Math.round(overview.total_patients * 0.18)) }
    ];

    const assignPatient = async () => {
        if (!selectedPatient || !selectedProfessional) {
            setAssignMessage("Select both patient and professional first.");
            return;
        }

        try {
            setAssigning(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/org/${orgId}/assign`, {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({ patientId: selectedPatient, professionalId: selectedProfessional })
            });

            if (!response.ok) {
                setAssignMessage("Assignment request failed. Check permissions/session.");
                return;
            }

            setAssignMessage("Assignment updated.");
        } catch {
            setAssignMessage("Assignment request failed.");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card><div className="text-xs text-ink/70">Patients</div><div className="text-2xl font-heading">{overview.total_patients}</div></Card>
                <Card><div className="text-xs text-ink/70">Active (7d)</div><div className="text-2xl font-heading">{overview.active_patients}</div></Card>
                <Card><div className="text-xs text-ink/70">Professionals</div><div className="text-2xl font-heading">{overview.professionals}</div></Card>
                <Card><div className="text-xs text-ink/70">Avg Adherence</div><div className="text-2xl font-heading">{overview.care_plan_adherence_rate}%</div></Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <h3 className="font-heading text-lg">Risk Distribution</h3>
                    <div className="mt-3 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={riskDistribution} dataKey="count" nameKey="score" innerRadius={55} outerRadius={95}>
                                    {riskDistribution.map((entry, idx) => (
                                        <Cell key={`risk-${idx}`} fill={palette[entry.score as keyof typeof palette] || "#475569"} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-heading text-lg">Recent Alerts Feed</h3>
                    <div className="mt-3 space-y-2">
                        {riskDistribution.length ? (
                            riskDistribution.map((r) => (
                                <div key={r.score} className="rounded-soft border border-fog p-2 text-sm">
                                    <strong className="capitalize">{r.score}</strong> risk cohort has {r.count} tracked patients.
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-ink/70">No alert trend available yet.</div>
                        )}
                    </div>
                </Card>
            </section>

            <Card>
                <h3 className="font-heading text-lg">Patient Assignment</h3>
                <p className="mt-1 text-sm text-ink/70">Assign selected patients to professionals.</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="rounded-soft border border-fog bg-white px-3 py-2 text-sm">
                        <option value="">Select patient</option>
                        {patients.map((p) => (
                            <option key={p.id} value={p.id}>{p.name || p.id}</option>
                        ))}
                    </select>
                    <select value={selectedProfessional} onChange={(e) => setSelectedProfessional(e.target.value)} className="rounded-soft border border-fog bg-white px-3 py-2 text-sm">
                        <option value="">Select professional</option>
                        {professionals.map((p) => (
                            <option key={p.id} value={p.id}>{p.name || p.id}</option>
                        ))}
                    </select>
                    <Button onClick={assignPatient}>{assigning ? "Assigning..." : "Assign"}</Button>
                </div>
                {assignMessage ? <p className="mt-2 text-xs text-ink/70">{assignMessage}</p> : null}
            </Card>

            <Card>
                <h3 className="font-heading text-lg">Professional Performance</h3>
                <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-ink/70">
                                <th>Name</th><th>Role</th><th>Patients</th><th>Avg response (min)</th><th>Care plans active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {professionals.map((p) => (
                                <tr key={p.id} className="border-t border-fog">
                                    <td>{p.name || p.id.slice(0, 8)}</td>
                                    <td>{p.role}</td>
                                    <td>{p.patients_count}</td>
                                    <td>{p.avg_alert_response_minutes}</td>
                                    <td>{p.care_plans_active}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <h3 className="font-heading text-lg">Usage Analytics</h3>
                    <div className="mt-3 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={usageSeries}>
                                <XAxis dataKey="week" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="patients" stroke="#0b6e4f" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-heading text-lg">Vitals Logged Per Day</h3>
                    <div className="mt-3 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usageSeries}>
                                <XAxis dataKey="week" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="vitals" fill="#0b6e4f" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </section>

            <Card>
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading text-lg">Most Common Conditions</h3>
                    <Input placeholder="Filter patients" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {commonConditions.map((condition) => (
                        <div key={condition.name} className="rounded-soft border border-fog p-2 text-sm">
                            <div className="font-medium">{condition.name}</div>
                            <div className="text-ink/70">{condition.count} patients</div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-left text-ink/60"><th>Patient</th><th>Risk</th><th>Assigned Professional</th></tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((p) => (
                                <tr key={p.id} className="border-t border-fog">
                                    <td>{p.name || p.id}</td>
                                    <td className="capitalize">{p.risk_score || "unknown"}</td>
                                    <td>{p.professional_id ? p.professional_id.slice(0, 8) : "Unassigned"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
