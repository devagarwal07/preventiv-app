import { Card } from "@/components/ui/primitives";
import { serverApi } from "@/lib/serverApi";

export default async function AdminPage() {
    const [pendingProfessionals, flaggedPosts, thresholds] = await Promise.all([
        serverApi.get<Array<Record<string, unknown>>>("/platform-admin/professionals/pending"),
        serverApi.get<Array<Record<string, unknown>>>("/platform-admin/flagged-posts"),
        serverApi.get<Array<Record<string, unknown>>>("/platform-admin/thresholds")
    ]);

    return (
        <div className="space-y-4">
            <Card>
                <h2 className="font-heading text-2xl">Platform Admin Console</h2>
                <p className="mt-1 text-sm text-ink/70">Internal controls for users, organizations, AI settings, and moderation.</p>
            </Card>

            <section className="grid gap-3 sm:grid-cols-3">
                <Card>
                    <div className="text-xs text-ink/60">Pending Professional Verifications</div>
                    <div className="text-3xl font-heading">{pendingProfessionals?.length || 0}</div>
                </Card>
                <Card>
                    <div className="text-xs text-ink/60">Flagged Community Posts</div>
                    <div className="text-3xl font-heading">{flaggedPosts?.length || 0}</div>
                </Card>
                <Card>
                    <div className="text-xs text-ink/60">Threshold Config Entries</div>
                    <div className="text-3xl font-heading">{thresholds?.length || 0}</div>
                </Card>
            </section>
        </div>
    );
}
