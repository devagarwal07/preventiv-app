import { useMemo } from "react";

interface Props {
    value: "7d" | "30d" | "90d";
    onRangeChange: (payload: { from: string; to: string; range: "7d" | "30d" | "90d" }) => void;
}

const daysForRange = (range: "7d" | "30d" | "90d"): number => {
    if (range === "7d") return 7;
    if (range === "30d") return 30;
    return 90;
};

export function DateRangePicker({ value, onRangeChange }: Props) {
    const ranges: Array<"7d" | "30d" | "90d"> = ["7d", "30d", "90d"];

    const to = useMemo(() => new Date(), [value]);

    return (
        <div className="inline-flex overflow-hidden rounded-soft border border-fog bg-white">
            {ranges.map((range) => (
                <button
                    key={range}
                    type="button"
                    className={`px-3 py-1 text-xs ${range === value ? "bg-primary text-white" : "text-ink"}`}
                    onClick={() => {
                        const t = new Date();
                        const f = new Date();
                        f.setDate(f.getDate() - daysForRange(range));
                        onRangeChange({ from: f.toISOString(), to: t.toISOString(), range });
                    }}
                >
                    {range}
                </button>
            ))}
            <span className="hidden">{to.toISOString()}</span>
        </div>
    );
}
