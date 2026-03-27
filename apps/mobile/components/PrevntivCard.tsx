import type { PropsWithChildren } from "react";
import { View } from "react-native";

export function PrevntivCard({ children }: PropsWithChildren) {
    return <View className="rounded-2xl bg-white p-4 shadow-sm">{children}</View>;
}
