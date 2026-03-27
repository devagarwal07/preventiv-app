import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
    name: "Prevntiv",
    slug: "prevntiv",
    version: "1.0.0",
    scheme: "prevntiv",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
        backgroundColor: "#0B6E4F"
    },
    ios: {
        bundleIdentifier: "com.prevntiv.app",
        supportsTablet: false,
        infoPlist: {
            NSCameraUsageDescription: "Prevntiv uses camera to scan and upload lab reports.",
            NSPhotoLibraryUsageDescription: "Prevntiv accesses photos to upload lab reports.",
            NSHealthShareUsageDescription: "Prevntiv reads health data for wearable sync.",
            NSHealthUpdateUsageDescription: "Prevntiv updates your care journey with health readings."
        }
    },
    android: {
        package: "com.prevntiv.app",
        permissions: [
            "CAMERA",
            "READ_EXTERNAL_STORAGE",
            "ACTIVITY_RECOGNITION",
            "POST_NOTIFICATIONS"
        ]
    },
    plugins: [
        "expo-router",
        "expo-notifications",
        "expo-secure-store"
    ],
    experiments: {
        typedRoutes: true
    }
};

export default config;
