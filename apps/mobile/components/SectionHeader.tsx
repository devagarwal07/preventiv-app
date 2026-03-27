import { Text, View } from "react-native";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <View className="mb-2">
            <Text className="text-lg font-semibold text-slate-900">{title}</Text>
            {subtitle ? <Text className="text-xs text-slate-500">{subtitle}</Text> : null}
        </View>
    );
}
