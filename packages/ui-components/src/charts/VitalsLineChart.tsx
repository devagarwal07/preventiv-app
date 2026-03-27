import {
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceArea,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import type { BaselineValue, Vital, VitalType } from "./types";

const parsePrimaryValue = (vital: Vital): number => {
    if (vital.type === "bp") {
        return Number(vital.value.systolic || 0);
    }
    if (vital.type === "spo2") {
        return Number(vital.value.percent || 0);
    }
    if (vital.type === "hr") {
        return Number(vital.value.bpm || 0);
    }
    if (vital.type === "steps") {
        return Number(vital.value.count || 0);
    }
    if (vital.type === "sleep") {
        return Number(vital.value.quality_score || 0);
    }
    return Number(vital.value.value || vital.value.kg || vital.value.ms || 0);
};

const normalRangeForVital = (type: VitalType): [number, number] | null => {
    switch (type) {
        case "bp":
            return [90, 120];
        case "glucose":
            return [70, 140];
        case "hr":
            return [60, 100];
        case "spo2":
            return [94, 100];
        case "temperature":
            return [36.1, 37.2];
        default:
            return null;
    }
};

const valueColor = (value: number, range: [number, number] | null): string => {
    if (!range) return "#0B6E4F";
    if (value < range[0] || value > range[1]) return "#C53030";
    const lowerWarn = range[0] + (range[1] - range[0]) * 0.2;
    const upperWarn = range[1] - (range[1] - range[0]) * 0.2;
    if (value < lowerWarn || value > upperWarn) return "#D69E2E";
    return "#2563EB";
};

interface Props {
    data: Vital[];
    vitalType: VitalType;
    baseline?: BaselineValue;
    dateRange: "7d" | "30d" | "90d";
}

export function VitalsLineChart({ data, vitalType, baseline }: Props) {
    const range = normalRangeForVital(vitalType);
    const chartData = data
        .filter((v) => v.type === vitalType)
        .map((v) => ({
            x: new Date(v.recorded_at).toLocaleDateString(),
            y: parsePrimaryValue(v),
            source: v.source || "manual",
            anomaly: Boolean(v.is_anomaly),
            rawTime: v.recorded_at
        }));

    return (
        <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d5dfd9" />
                    <XAxis dataKey="x" />
                    <YAxis />
                    {range ? <ReferenceArea y1={range[0]} y2={range[1]} fill="#D9F7E8" fillOpacity={0.4} /> : null}
                    {typeof baseline === "number" ? <ReferenceLine y={baseline} stroke="#E8A917" strokeDasharray="4 4" /> : null}
                    <Tooltip
                        formatter={(value, _name, payload) => [
                            `${Number(value || 0)}`,
                            `source: ${String((payload as { payload?: { source?: string } })?.payload?.source || "manual")}`
                        ]}
                        labelFormatter={(label, payload) =>
                            `${label} (${String(payload?.[0]?.payload?.rawTime || "")})`
                        }
                    />
                    <Line
                        type="monotone"
                        dataKey="y"
                        stroke="#0B6E4F"
                        strokeWidth={2}
                        dot={(props) => {
                            const value = Number((props as { payload?: { y?: number } }).payload?.y || 0);
                            const anomaly = Boolean((props as { payload?: { anomaly?: boolean } }).payload?.anomaly);
                            const fill = anomaly ? "#C53030" : valueColor(value, range);
                            return (
                                <circle
                                    cx={Number(props.cx || 0)}
                                    cy={Number(props.cy || 0)}
                                    r={anomaly ? 4 : 3}
                                    fill={fill}
                                    stroke={fill}
                                />
                            );
                        }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
