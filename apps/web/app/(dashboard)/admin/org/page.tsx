import { Card } from "@/components/ui/primitives";
import { serverApi } from "@/lib/serverApi";
import { OrgDashboardClient } from "./OrgDashboardClient";

type Overview = {
    total_patients: number;
    active_patients: number;
    professionals: number;
    care_plan_adherence_rate: number;
    risk_distribution: Array<{ score: string; count: number }>;
};

const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "00000000-0000-0000-0000-000000000001";

export default async function OrgAdminPage() {
    const [overview, professionals, patients, riskDistribution] = await Promise.all([
        serverApi.get<Overview>(`/org/${ORG_ID}/overview`),
        serverApi.get<Array<Record<string, unknown>>>(`/org/${ORG_ID}/professionals`),
        serverApi.get<Array<Record<string, unknown>>>(`/org/${ORG_ID}/patients?limit=50&page=1`),
        serverApi.get<Array<{ score: string; count: number }>>(`/org/${ORG_ID}/risk-distribution`)
    ]);

    if (!overview) {
        return (
            <main className="mx-auto max-w-6xl p-6">
                <Card>
                    <h1 className="font-heading text-2xl">Org Admin Dashboard</h1>
                    <p className="mt-2 text-sm text-ink/70">
                        Unable to load org data. Set NEXT_PUBLIC_DEFAULT_ORG_ID and authenticate as org admin.
                    </p>
                </Card>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-7xl p-6">
            <div className="mb-4">
                <h1 className="font-heading text-2xl">Hospital/Clinic Admin Dashboard</h1>
                <p className="text-sm text-ink/70">Operational KPIs, patient assignment, and org analytics.</p>
            </div>
            <OrgDashboardClient
                orgId={ORG_ID}
                overview={overview}
                professionals={(professionals || []) as never}
                patients={(patients || []) as never}
                riskDistribution={riskDistribution || overview.risk_distribution || []}
            />
        </main>
    );
}
