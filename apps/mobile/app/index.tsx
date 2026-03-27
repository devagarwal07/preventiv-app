import { Redirect } from "expo-router";
import { useAuthStore } from "@/src/stores/useAuthStore";

export default function Index() {
    const token = useAuthStore((s) => s.token);
    const hydrated = useAuthStore((s) => s.hydrated);

    if (!hydrated) return null;
    return <Redirect href={token ? "/(tabs)/home" : "/(auth)/welcome"} />;
}
