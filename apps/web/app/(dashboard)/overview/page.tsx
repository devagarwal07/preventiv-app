"use client";

import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";
import { Badge, Button, Card, Skeleton } from "@/components/ui/primitives";
import { useAppointments } from "@/lib/hooks";

const riskData = [
    { name: "Low", value: 62, color: "#0B6E4F" },
    { name: "Moderate", value: 28, color: "#E8A917" },
    { name: "High", value: 10, color: "#C53030" }
];

const mockAlerts = [
    { id: "a1", patient: "Riya Sharma", severity: "high", time: "08:12" },
    { id: "a2", patient: "Ishaan Mehta", severity: "moderate", time: "08:50" },
    { id: "a3", patient: "Nandini Rao", severity: "high", time: "09:03" }
];

export default function OverviewPage() {
    const appointments = useAppointments({ scope: "today" });

    if (appointments.isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const count = Array.isArray(appointments.data) ? appointments.data.length : 0;

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card><p className="text-xs text-ink/70">Total Patients</p><p className="font-heading text-3xl">128</p></Card>
                <Card><p className="text-xs text-ink/70">High-risk Patients</p><p className="font-heading text-3xl text-red-700">18</p></Card>
                <Card><p className="text-xs text-ink/70">Today's Appointments</p><p className="font-heading text-3xl">{count}</p></Card>
                <Card><p className="text-xs text-ink/70">Pending Follow-ups</p><p className="font-heading text-3xl">31</p></Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                <Card>
                    <h3 className="font-heading text-lg">Risk Distribution</h3>
                    <div className="mt-3 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={riskData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45}>
                                    {riskData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                        {riskData.map((r) => (
                            <span key={r.name} className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />{r.name}</span>
                        ))}
                    </div>
                </Card>

                <Card>
                    <h3 className="font-heading text-lg">Alert Feed</h3>
                    <div className="mt-3 space-y-2">
                        {mockAlerts.slice(0, 10).map((alert) => (
                            <div key={alert.id} className="flex items-center justify-between rounded-soft border border-fog px-3 py-2">
                                <div>
                                    <p className="text-sm font-medium">{alert.patient}</p>
                                    <p className="text-xs text-ink/60">{alert.time}</p>
                                </div>
                                <Badge tone={alert.severity as "high" | "moderate"}>{alert.severity}</Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <h3 className="font-heading text-lg">Today's Schedule</h3>
                    <div className="mt-3 space-y-2">
                        {(Array.isArray(appointments.data) ? appointments.data.slice(0, 6) : []).map((item, idx) => (
                            <div key={`appt-${idx}`} className="rounded-soft border border-fog px-3 py-2 text-sm">
                                {(item as { scheduled_at?: string; patient_name?: string }).scheduled_at || "--"} · {(item as { patient_name?: string }).patient_name || "Patient"}
                            </div>
                        ))}
                    </div>
                </Card>
                <Card className="flex flex-col gap-2">
                    <h3 className="font-heading text-lg">Quick Actions</h3>
                    <Button className="justify-start">Book follow-up</Button>
                    <Button className="justify-start">Create care plan</Button>
                </Card>
            </div>
        </div>
    );
}
