import { Link } from "expo-router";
import { Text, TextInput, View } from "react-native";

export default function RegisterScreen() {
    return (
        <View className="flex-1 bg-slate-50 px-5 pt-16">
            <Text className="text-3xl font-bold text-slate-900">Create account</Text>
            <Text className="mt-1 text-slate-500">Get started with preventive care</Text>

            <View className="mt-8 gap-3">
                <TextInput placeholder="Full name" className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
                <TextInput placeholder="Email" autoCapitalize="none" className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
                <TextInput placeholder="Password" secureTextEntry className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
            </View>

            <Text className="mt-4 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white">Continue</Text>
            <Link href="/(auth)/onboarding/step1" className="mt-4 text-center text-primary">Go to onboarding</Link>
        </View>
    );
}
