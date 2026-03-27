"use client";

import Link from "next/link";
import { Badge, Button, Card, Skeleton } from "@/components/ui/primitives";

const alerts = [
    { id: "1", severity: "critical", title: "SpO2 dropped below 89%", vital: "spo2", at: "09:12" },
    { id: "2", severity: "moderate", title: "BP above baseline for 3 days", vital: "bp", at: "08:42" },
    { id: "3", severity: "low", title: "Missed care-plan item", vital: "care-plan", at: "07:20" }
];

const order = ["critical", "moderate", "low"] as const;

export default function PatientAlertsPage() {
    if (!alerts) {
        return <Skeleton className="h-48 w-full" />;
    }

    return (
        <div className="space-y-4">
            {order.map((severity) => {
                const group = alerts.filter((a) => a.severity === severity);
                if (!group.length) return null;

                return (
                    <Card key={severity}>
                        <h3 className="font-heading text-lg capitalize">{severity}</h3>
                        <div className="mt-3 space-y-2">
                            {group.map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between rounded-soft border border-fog px-3 py-2">
                                    <div>
                                        <p className="text-sm font-medium">{alert.title}</p>
                                        <p className="text-xs text-ink/60">{alert.at}</p>
                                        <Link href={`?focus=${alert.vital}`} className="text-xs text-primary underline">
                                            View related vital
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge tone={severity === "critical" ? "high" : (severity as "moderate" | "low")}>{severity}</Badge>
                                        <Button className="bg-white text-primary border border-primary">Mark resolved</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
