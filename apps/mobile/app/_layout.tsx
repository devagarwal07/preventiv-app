import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useBootstrap } from "@/src/hooks/useBootstrap";
import { useNotificationsStore } from "@/src/stores/useNotificationsStore";

export default function RootLayout() {
    const [queryClient] = useState(() => new QueryClient());
    const router = useRouter();
    const incrementUnread = useNotificationsStore((s) => s.incrementUnread);

    useBootstrap();

    useEffect(() => {
        const receiveSub = Notifications.addNotificationReceivedListener(() => {
            incrementUnread();
        });

        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const route = response.notification.request.content.data?.route;
            if (typeof route === "string") {
                router.push(route as never);
            }
        });

        return () => {
            Notifications.removeNotificationSubscription(receiveSub);
            Notifications.removeNotificationSubscription(responseSub);
        };
    }, [incrementUnread, router]);

    return (
        <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="reports/[reportId]" options={{ headerShown: true, title: "Lab Report" }} />
            </Stack>
        </QueryClientProvider>
    );
}
