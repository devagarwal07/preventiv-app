import { Text, View } from "react-native";

export function RiskBadge({ level }: { level: "low" | "moderate" | "high" }) {
    const style =
        level === "high"
            ? "bg-red-100 text-red-700"
            : level === "moderate"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700";

    return (
        <View className={`self-start rounded-full px-2 py-1 ${style.split(" ")[0]}`}>
            <Text className={`text-xs font-semibold ${style.split(" ")[1]}`}>{level.toUpperCase()}</Text>
        </View>
    );
}
