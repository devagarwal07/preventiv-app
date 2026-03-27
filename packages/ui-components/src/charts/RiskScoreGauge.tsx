import { useMemo } from "react";
import type { RiskCategory } from "./types";

interface Props {
    category: RiskCategory;
    score: "low" | "moderate" | "high";
    trend: "up" | "down" | "stable";
    lastUpdatedHoursAgo?: number;
}

const scoreValue = (score: "low" | "moderate" | "high"): number => {
    if (score === "low") return 25;
    if (score === "moderate") return 55;
    return 85;
};

const scoreColor = (score: "low" | "moderate" | "high"): string => {
    if (score === "low") return "#0B6E4F";
    if (score === "moderate") return "#E8A917";
    return "#C53030";
};

export function RiskScoreGauge({ category, score, trend, lastUpdatedHoursAgo = 1 }: Props) {
    const value = scoreValue(score);
    const needleAngle = useMemo(() => -90 + (value / 100) * 180, [value]);

    const trendSymbol = trend === "up" ? "▲" : trend === "down" ? "▼" : "■";
    const trendColor = trend === "up" ? "#C53030" : trend === "down" ? "#0B6E4F" : "#6B7280";

    return (
        <div className="rounded-card border border-fog bg-white p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink/65">{category}</p>
            <svg viewBox="0 0 200 130" className="h-28 w-full">
                <defs>
                    <linearGradient id={`risk-gradient-${category}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0B6E4F" />
                        <stop offset="50%" stopColor="#E8A917" />
                        <stop offset="100%" stopColor="#C53030" />
                    </linearGradient>
                </defs>
                <path
                    d="M20 110 A80 80 0 0 1 180 110"
                    fill="none"
                    stroke={`url(#risk-gradient-${category})`}
                    strokeWidth="14"
                    strokeLinecap="round"
                />
                <g transform="translate(100 110)">
                    <line
                        x1="0"
                        y1="0"
                        x2={`${70 * Math.cos((needleAngle * Math.PI) / 180)}`}
                        y2={`${70 * Math.sin((needleAngle * Math.PI) / 180)}`}
                        stroke={scoreColor(score)}
                        strokeWidth="4"
                        strokeLinecap="round"
                    >
                        <animate attributeName="x2" dur="700ms" fill="freeze" to={`${70 * Math.cos((needleAngle * Math.PI) / 180)}`} />
                        <animate attributeName="y2" dur="700ms" fill="freeze" to={`${70 * Math.sin((needleAngle * Math.PI) / 180)}`} />
                    </line>
                    <circle cx="0" cy="0" r="6" fill="#153226" />
                </g>
            </svg>
            <div className="mt-1 flex items-center justify-between text-sm">
                <span className="font-semibold" style={{ color: scoreColor(score) }}>
                    {score.toUpperCase()}
                </span>
                <span style={{ color: trendColor }}>
                    {trendSymbol} {trend}
                </span>
            </div>
            <p className="mt-1 text-xs text-ink/60">Last updated {lastUpdatedHoursAgo} hrs ago</p>
        </div>
    );
}
