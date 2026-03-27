import Link from "next/link";

const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/organizations", label: "Organizations" },
    { href: "/admin/moderation", label: "Moderation" }
];

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="mx-auto grid min-h-screen max-w-7xl gap-4 p-6 md:grid-cols-[220px_1fr]">
            <aside className="rounded-card border border-fog bg-white p-4">
                <h1 className="font-heading text-xl">Prevntiv Admin</h1>
                <nav className="mt-4 grid gap-2 text-sm">
                    {nav.map((item) => (
                        <Link key={item.href} href={item.href} className="rounded-soft px-2 py-1.5 text-ink hover:bg-secondary">
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>
            <section>{children}</section>
        </main>
    );
}
