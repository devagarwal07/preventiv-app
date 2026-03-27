import { Card } from "@/components/ui/primitives";
import { serverApi } from "@/lib/serverApi";

export default async function PlatformOrganizationsPage() {
    const orgs = await serverApi.get<Array<Record<string, unknown>>>("/platform-admin/orgs");

    return (
        <div className="space-y-4">
            <Card>
                <h2 className="font-heading text-xl">Organization Management</h2>
                <p className="mt-1 text-sm text-ink/70">Manage hospitals and clinics, plans, and operating stats.</p>
            </Card>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-ink/70"><th>Name</th><th>Type</th><th>Plan</th><th>Admin</th></tr>
                        </thead>
                        <tbody>
                            {(orgs || []).map((org) => (
                                <tr key={String(org.id)} className="border-t border-fog">
                                    <td>{String(org.name || "-")}</td>
                                    <td>{String(org.type || "-")}</td>
                                    <td>{String(org.plan || "starter")}</td>
                                    <td>{String(org.admin_name || "-")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
