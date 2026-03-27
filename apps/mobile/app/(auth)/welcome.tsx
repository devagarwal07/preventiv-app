import { Link } from "expo-router";
import { Text, View } from "react-native";
import { PrevntivCard } from "@/components/PrevntivCard";

export default function WelcomeScreen() {
    return (
        <View className="flex-1 bg-primary px-5 pt-20">
            <Text className="text-4xl font-bold text-white">Prevntiv</Text>
            <Text className="mt-2 text-white/80">Your preventive health companion</Text>

            <View className="mt-8 gap-4">
                <PrevntivCard>
                    <Text className="text-base text-slate-900">Build healthier routines with guided care plans and live insights.</Text>
                </PrevntivCard>
            </View>

            <View className="mt-auto mb-10 gap-3">
                <Link href="/(auth)/login" className="rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-primary">
                    Login
                </Link>
                <Link href="/(auth)/register" className="rounded-2xl border border-white px-4 py-3 text-center text-base font-semibold text-white">
                    Register
                </Link>
            </View>
        </View>
    );
}
