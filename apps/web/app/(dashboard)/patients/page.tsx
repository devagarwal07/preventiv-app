"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, Input, Skeleton } from "@/components/ui/primitives";

const patientRows = [
    { id: "p-101", name: "Riya Sharma", age: 41, condition: "Diabetes", lastActive: "2026-03-27", risk: "high", since: "2025-08-01" },
    { id: "p-102", name: "Arjun Menon", age: 52, condition: "Hypertension", lastActive: "2026-03-26", risk: "moderate", since: "2025-11-14" },
    { id: "p-103", name: "Nandini Rao", age: 33, condition: "Lifestyle", lastActive: "2026-03-27", risk: "low", since: "2026-01-03" }
];

export default function PatientsPage() {
    const [search, setSearch] = useState("");
    const [risk, setRisk] = useState<string>("all");

    const rows = useMemo(
        () =>
            patientRows.filter(
                (row) =>
                    row.name.toLowerCase().includes(search.toLowerCase()) &&
                    (risk === "all" || row.risk === risk)
            ),
        [search, risk]
    );

    if (!rows) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <div className="space-y-4">
            <h2 className="font-heading text-2xl">Patient List</h2>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input placeholder="Search by patient name" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="rounded-soft border border-fog px-3 py-2 text-sm" value={risk} onChange={(e) => setRisk(e.target.value)}>
                    <option value="all">All risks</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                </select>
            </div>

            <Card className="overflow-x-auto p-0">
                <table className="min-w-full text-sm">
                    <thead className="bg-secondary text-left text-xs uppercase tracking-[0.12em] text-ink/70">
                        <tr>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Age</th>
                            <th className="px-3 py-2">Condition</th>
                            <th className="px-3 py-2">Risk</th>
                            <th className="px-3 py-2">Last Vital</th>
                            <th className="px-3 py-2">Assigned Since</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-t border-fog hover:bg-secondary/60">
                                <td className="px-3 py-2">
                                    <Link href={`/patients/${row.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
                                        {row.name}
                                    </Link>
                                </td>
                                <td className="px-3 py-2">{row.age}</td>
                                <td className="px-3 py-2">{row.condition}</td>
                                <td className="px-3 py-2"><Badge tone={row.risk as "high" | "moderate" | "low"}>{row.risk}</Badge></td>
                                <td className="px-3 py-2">{row.lastActive}</td>
                                <td className="px-3 py-2">{row.since}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
