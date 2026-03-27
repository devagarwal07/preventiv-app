"use client";

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <div className={`rounded-card border border-fog bg-white p-4 ${className}`}>{children}</div>;
}

export function Button({
    children,
    className = "",
    onClick,
    type = "button"
}: {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    type?: "button" | "submit";
}) {
    return (
        <button type={type} onClick={onClick} className={`rounded-soft bg-primary px-3 py-2 text-sm text-white ${className}`}>
            {children}
        </button>
    );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "low" | "moderate" | "high" | "neutral" }) {
    const toneClass =
        tone === "high"
            ? "bg-red-100 text-red-700"
            : tone === "moderate"
                ? "bg-amber-100 text-amber-700"
                : tone === "low"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700";

    return <span className={`rounded-full px-2 py-1 text-xs ${toneClass}`}>{children}</span>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`w-full rounded-soft border border-fog bg-white px-3 py-2 text-sm ${props.className || ""}`} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-soft bg-secondary ${className}`} />;
}

export function Tabs({
    value,
    onChange,
    options
}: {
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <div className="inline-flex overflow-hidden rounded-soft border border-fog bg-white">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className={`px-3 py-1.5 text-xs ${value === opt.value ? "bg-primary text-white" : "text-ink"}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
