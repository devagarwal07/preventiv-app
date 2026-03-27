import { useEffect } from "react";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { registerPushNotifications } from "@/src/lib/notifications";

export const useBootstrap = () => {
    const hydrate = useAuthStore((s) => s.hydrate);
    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (!user?.id) return;
        void registerPushNotifications(user.id);
    }, [user?.id]);
};
