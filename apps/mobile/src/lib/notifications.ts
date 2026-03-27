import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "@/src/lib/api";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true
    })
});

export const registerPushNotifications = async (userId?: string): Promise<string | null> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    if (userId && token) {
        try {
            await api.post("/devices/register", {
                userId,
                fcmToken: token,
                platform: "android"
            });
        } catch {
            // Best effort token registration.
        }
    }

    return token;
};
