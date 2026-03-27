"use client";

import { Card, Skeleton, Tabs } from "@/components/ui/primitives";
import { useState } from "react";
import { useAppointments } from "@/lib/hooks";

export default function AppointmentsPage() {
    const [scope, setScope] = useState("today");
    const { data, isLoading } = useAppointments({ scope });

    if (isLoading) {
        return <Skeleton className="h-56 w-full" />;
    }

    return (
        <div className="space-y-4">
            <Tabs
                value={scope}
                onChange={setScope}
                options={[
                    { value: "today", label: "Today" },
                    { value: "week", label: "This Week" },
                    { value: "all", label: "All" }
                ]}
            />
            <Card>
                <h3 className="font-heading text-lg">Schedule Timeline</h3>
                <div className="mt-3 space-y-2">
                    {(Array.isArray(data) ? data : []).slice(0, 20).map((item, idx) => (
                        <div key={`ap-${idx}`} className="rounded-soft border border-fog px-3 py-2 text-sm">
                            {String((item as { scheduled_at?: string }).scheduled_at || "--")} · {String((item as { patient_name?: string }).patient_name || "Patient")}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
