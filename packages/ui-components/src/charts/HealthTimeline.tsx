import { useMemo, useState } from "react";
import type { TimelineEvent } from "./types";

interface Props {
    patientId: string;
    events?: TimelineEvent[];
}

const iconFor = (eventType: string): string => {
    if (eventType.includes("anomaly")) return "⚠";
    if (eventType.includes("lab")) return "🧪";
    if (eventType.includes("consult")) return "🩺";
    if (eventType.includes("care_plan")) return "📋";
    if (eventType.includes("risk")) return "📈";
    return "•";
};

export function HealthTimeline({ patientId, events = [] }: Props) {
    const [page, setPage] = useState(1);
    const pageSize = 8;

    const shown = useMemo(() => events.slice(0, page * pageSize), [events, page]);

    return (
        <div className="rounded-card border border-fog bg-white p-4">
            <h4 className="font-semibold text-ink">Health Timeline</h4>
            <ul className="mt-3 space-y-3">
                {shown.map((event) => (
                    <li key={event.id} className="relative pl-6">
                        <span className="absolute left-0 top-0 text-xs">{iconFor(event.event_type)}</span>
                        <p className="text-sm text-ink">{event.summary}</p>
                        <p className="text-xs text-ink/60">{new Date(event.occurred_at).toLocaleString()}</p>
                    </li>
                ))}
            </ul>
            {shown.length < events.length ? (
                <button className="mt-3 text-xs text-primary underline" type="button" onClick={() => setPage((p) => p + 1)}>
                    Load more
                </button>
            ) : null}
            <span className="hidden">{patientId}</span>
        </div>
    );
}
