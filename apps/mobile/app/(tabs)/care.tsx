import { Text, View } from "react-native";
import { SectionHeader } from "@/components/SectionHeader";

export default function CareTab() {
    return (
        <View className="flex-1 bg-slate-50 px-4 pt-14">
            <SectionHeader title="Care Plans" subtitle="Today's actions and adherence" />
            <Text className="text-sm text-slate-600">Care plan execution UI expands in upcoming prompts.</Text>
        </View>
    );
}
