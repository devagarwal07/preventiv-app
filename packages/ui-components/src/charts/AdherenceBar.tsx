import { useState } from "react";
import type { AdherenceData, CarePlan } from "./types";

interface Props {
    carePlan: CarePlan;
    adherenceData: AdherenceData;
}

export function AdherenceBar({ carePlan, adherenceData }: Props) {
    const [expanded, setExpanded] = useState(false);
    const percent = Math.max(0, Math.min(100, adherenceData.last7dPercent));

    return (
        <div className="rounded-card border border-fog bg-white p-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-ink">{carePlan.title}</h4>
                <span className="text-sm text-ink/70">{percent.toFixed(0)}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between">
                <button
                    type="button"
                    className="text-xs text-primary underline"
                    onClick={() => setExpanded((x) => !x)}
                >
                    {expanded ? "Hide" : "Show"} item breakdown
                </button>
                {Object.values(adherenceData.streakByItem).some((x) => x > 5) ? <span title="Streak">🔥</span> : null}
            </div>
            {expanded ? (
                <ul className="mt-2 space-y-1 text-xs text-ink/75">
                    {carePlan.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between">
                            <span>{item.action}</span>
                            <span>{adherenceData.streakByItem[item.id] || 0}d streak</span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
