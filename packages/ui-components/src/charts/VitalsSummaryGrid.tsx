import type { VitalsSummary } from "./types";

interface Props {
    summary: VitalsSummary;
}

const statusColor = {
    normal: "text-[#0B6E4F]",
    borderline: "text-[#D69E2E]",
    abnormal: "text-[#C53030]"
};

const trendSymbol = {
    up: "▲",
    down: "▼",
    stable: "■"
};

export function VitalsSummaryGrid({ summary }: Props) {
    const entries = Object.entries(summary);

    return (
        <div className="grid gap-3 md:grid-cols-3">
            {entries.map(([type, item]) => (
                <article key={type} className="rounded-card border border-fog bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-ink/60">{type}</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">
                        {item.currentValue}
                        <span className="ml-1 text-sm text-ink/60">{item.unit}</span>
                    </p>
                    <p className={`mt-2 text-sm ${statusColor[item.status]}`}>
                        {trendSymbol[item.trend]} {item.changePercent}% vs 7d avg
                    </p>
                </article>
            ))}
        </div>
    );
}
