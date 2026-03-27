import { Card } from "@/components/ui/primitives";
import { serverApi } from "@/lib/serverApi";

export default async function PlatformModerationPage() {
    const flagged = await serverApi.get<Array<Record<string, unknown>>>("/platform-admin/flagged-posts");

    return (
        <div className="space-y-4">
            <Card>
                <h2 className="font-heading text-xl">Content Moderation</h2>
                <p className="mt-1 text-sm text-ink/70">Review flagged community threads and approve/remove quickly.</p>
            </Card>
            <div className="grid gap-3">
                {(flagged || []).map((post) => (
                    <Card key={String(post.id)}>
                        <div className="text-xs text-ink/60">{String(post.category || "general")} · {new Date(String(post.created_at || Date.now())).toLocaleString()}</div>
                        <p className="mt-2 text-sm text-ink/90">{String(post.content || "")}</p>
                        <div className="mt-2 text-xs text-ink/60">Author: {String(post.author_name || "Anonymous")}</div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
