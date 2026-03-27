import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuthStore } from "@/src/stores/useAuthStore";

export default function LoginScreen() {
    const login = useAuthStore((s) => s.login);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    return (
        <View className="flex-1 bg-slate-50 px-5 pt-16">
            <Text className="text-3xl font-bold text-slate-900">Welcome back</Text>
            <Text className="mt-1 text-slate-500">Login to continue your care journey</Text>

            <View className="mt-8 gap-3">
                <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
                <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
                {error ? <Text className="text-sm text-red-700">{error}</Text> : null}
            </View>

            <Text
                className="mt-4 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white"
                onPress={async () => {
                    try {
                        setError(null);
                        await login({ email, password });
                        router.replace("/(tabs)/home");
                    } catch {
                        setError("Invalid credentials");
                    }
                }}
            >
                Sign In
            </Text>

            <Link href="/(auth)/register" className="mt-4 text-center text-primary">Create an account</Link>
        </View>
    );
}
