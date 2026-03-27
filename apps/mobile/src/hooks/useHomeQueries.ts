import { useQueries, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";

const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
        return await fn();
    } catch {
        return fallback;
    }
};

export const useHomeQueries = () => {
    const queryClient = useQueryClient();

    const results = useQueries({
        queries: [
            {
                queryKey: ["home", "risk"],
                queryFn: () =>
                    safe(
                        async () => {
                            const res = await api.post("/ai/full-analysis/me", {});
                            return (res.data?.data || {
                                risk_scores: { cardiovascular: "moderate", glycemic: "low", lifestyle: "moderate" },
                                insights: []
                            }) as Record<string, unknown>;
                        },
                        {
                            risk_scores: { cardiovascular: "moderate", glycemic: "low", lifestyle: "moderate" },
                            insights: []
                        } as Record<string, unknown>
                    )
            },
            {
                queryKey: ["home", "care-plans"],
                queryFn: () =>
                    safe(
                        async () => {
                            const res = await api.get("/care-plans/me");
                            return (res.data?.data || []) as Array<Record<string, unknown>>;
                        },
                        [] as Array<Record<string, unknown>>
                    )
            },
            {
                queryKey: ["home", "vitals-mini"],
                queryFn: () =>
                    safe(
                        async () => {
                            const [bp, glucose] = await Promise.all([
                                api.get("/vitals/me", { params: { type: "bp", limit: 7, page: 1 } }),
                                api.get("/vitals/me", { params: { type: "glucose", limit: 7, page: 1 } })
                            ]);

                            return {
                                bp: (bp.data?.data?.rows || []) as Array<Record<string, unknown>>,
                                glucose: (glucose.data?.data?.rows || []) as Array<Record<string, unknown>>
                            };
                        },
                        { bp: [], glucose: [] } as { bp: Array<Record<string, unknown>>; glucose: Array<Record<string, unknown>> }
                    )
            },
            {
                queryKey: ["home", "appointments"],
                queryFn: () =>
                    safe(
                        async () => {
                            const res = await api.get("/appointments", { params: { scope: "all", status: "confirmed" } });
                            return (res.data?.data || []) as Array<Record<string, unknown>>;
                        },
                        [] as Array<Record<string, unknown>>
                    )
            },
            {
                queryKey: ["home", "alerts"],
                queryFn: () =>
                    safe(
                        async () => {
                            const res = await api.get("/notifications", { params: { page: 1, limit: 10 } });
                            return (res.data?.data || []) as Array<Record<string, unknown>>;
                        },
                        [] as Array<Record<string, unknown>>
                    )
            }
        ]
    });

    const [risk, carePlans, vitalsMini, appointments, alerts] = results;

    return {
        risk,
        carePlans,
        vitalsMini,
        appointments,
        alerts,
        refreshAll: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["home", "risk"] }),
                queryClient.invalidateQueries({ queryKey: ["home", "care-plans"] }),
                queryClient.invalidateQueries({ queryKey: ["home", "vitals-mini"] }),
                queryClient.invalidateQueries({ queryKey: ["home", "appointments"] }),
                queryClient.invalidateQueries({ queryKey: ["home", "alerts"] })
            ]);
        }
    };
};
