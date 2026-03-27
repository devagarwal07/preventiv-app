import { Card, Skeleton } from "@/components/ui/primitives";

export default function CommunityPage() {
    return (
        <div className="space-y-4">
            <Card>
                <h3 className="font-heading text-lg">Community Feed</h3>
                <p className="mt-1 text-sm text-ink/70">Professional moderation preview</p>
            </Card>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
}
