import { Card } from "@/components/ui/primitives";
import { serverApi } from "@/lib/serverApi";

export default async function PlatformUsersPage() {
    const users = await serverApi.get<Array<Record<string, unknown>>>("/platform-admin/users?limit=50&page=1");

    return (
        <div className="space-y-4">
            <Card>
                <h2 className="font-heading text-xl">User Management</h2>
                <p className="mt-1 text-sm text-ink/70">Search and review active/suspended users and role allocations.</p>
            </Card>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-ink/70">
                                <th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Verified</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(users || []).map((u) => (
                                <tr key={String(u.id)} className="border-t border-fog">
                                    <td>{String(u.email || "-")}</td>
                                    <td>{String(u.name || "-")}</td>
                                    <td>{String(u.role || "-")}</td>
                                    <td>{String(u.status || "active")}</td>
                                    <td>{String(Boolean(u.is_verified))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
