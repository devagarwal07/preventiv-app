import { router } from "expo-router";
import { Text, View } from "react-native";

export default function OnboardingStep3() {
    return (
        <View className="flex-1 bg-slate-50 px-5 pt-16">
            <Text className="text-2xl font-semibold text-slate-900">Step 3: Connect wearables</Text>
            <Text className="mt-2 text-slate-500">Link HealthKit / Google Fit to auto-sync vitals.</Text>
            <Text className="mt-6 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white" onPress={() => router.replace("/(tabs)/home")}>Finish</Text>
        </View>
    );
}
