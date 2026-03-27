"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
    { href: "/overview", label: "Overview" },
    { href: "/patients", label: "Patients" },
    { href: "/appointments", label: "Appointments" },
    { href: "/community", label: "Community" },
    { href: "/settings", label: "Settings" }
];

export function DashboardShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[260px_1fr] md:p-8">
            <aside className="panel p-4">
                <h2 className="font-heading text-2xl text-primary">Prevntiv</h2>
                <p className="mt-1 text-sm text-ink/70">Preventive intelligence dashboard</p>
                <nav className="mt-6 space-y-1">
                    {nav.map((item) => {
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block rounded-soft px-3 py-2 text-sm transition ${active ? "bg-primary text-white" : "hover:bg-secondary"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
            <main className="space-y-4">
                <header className="panel flex items-center justify-between px-5 py-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Live Care Ops</p>
                        <h1 className="font-heading text-xl">Professional Workspace</h1>
                    </div>
                </header>
                <section className="panel p-5">{children}</section>
            </main>
        </div>
    );
}
