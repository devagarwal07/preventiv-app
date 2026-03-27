"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/Shell";
import { useSocket } from "@/lib/socket";

function SocketBindings() {
    useSocket();
    return null;
}

function DashboardProviders({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <SocketBindings />
                <DashboardShell>{children}</DashboardShell>
            </QueryClientProvider>
        </SessionProvider>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <DashboardProviders>{children}</DashboardProviders>;
}
