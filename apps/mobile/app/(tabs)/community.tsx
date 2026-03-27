import { Text, View } from "react-native";
import { SectionHeader } from "@/components/SectionHeader";

export default function CommunityTab() {
    return (
        <View className="flex-1 bg-slate-50 px-4 pt-14">
            <SectionHeader title="Community" subtitle="Learn and share with others" />
            <Text className="text-sm text-slate-600">Community feed is enabled in later phases.</Text>
        </View>
    );
}
