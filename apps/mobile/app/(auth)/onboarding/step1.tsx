import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function OnboardingStep1() {
    return (
        <View className="flex-1 bg-slate-50 px-5 pt-16">
            <Text className="text-2xl font-semibold text-slate-900">Step 1: Personal info</Text>
            <Text className="mt-2 text-slate-500">Capture profile and demographics.</Text>
            <Link href="/(auth)/onboarding/step2" className="mt-6 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white">Next</Link>
        </View>
    );
}
