import { useMemo, useState } from "react";
import {
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { VictoryArea, VictoryChart, VictoryTheme } from "victory";
import { PrevntivCard } from "@/components/PrevntivCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useNotificationsStore } from "@/src/stores/useNotificationsStore";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useHomeQueries } from "@/src/hooks/useHomeQueries";
import { api } from "@/src/lib/api";

const quickLogTypes = [
    { key: "bp", label: "Blood Pressure" },
    { key: "glucose", label: "Glucose" },
    { key: "weight", label: "Weight" },
    { key: "hr", label: "Heart Rate" },
    { key: "mood", label: "Mood" },
    { key: "symptoms", label: "Symptoms" }
] as const;

const greetingFromHour = (hour: number): string => {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

const scoreColor = (score: number): string => {
    if (score >= 75) return "#0B6E4F";
    if (score >= 45) return "#E8A917";
    return "#C53030";
};

type QuickLogState = {
    type: string;
    systolic: string;
    diastolic: string;
    glucoseValue: string;
    glucoseContext: "fasting" | "post_meal";
};

const initialQuickLog: QuickLogState = {
    type: "",
    systolic: "",
    diastolic: "",
    glucoseValue: "",
    glucoseContext: "fasting"
};

export default function HomeTab() {
    const user = useAuthStore((s) => s.user);
    const unread = useNotificationsStore((s) => s.unreadCount);
    const { risk, carePlans, vitalsMini, appointments, refreshAll } = useHomeQueries();

    const [refreshing, setRefreshing] = useState(false);
    const [logModalOpen, setLogModalOpen] = useState(false);
    const [logState, setLogState] = useState<QuickLogState>(initialQuickLog);
    const [confetti, setConfetti] = useState(false);

    const now = new Date();
    const greeting = `${greetingFromHour(now.getHours())}, ${user?.name || "there"}`;

    const riskScores = (risk.data?.risk_scores || {}) as Record<string, string>;
    const highCount = Object.values(riskScores).filter((v) => v === "high").length;
    const moderateCount = Object.values(riskScores).filter((v) => v === "moderate").length;
    const wellnessScore = Math.max(0, 100 - highCount * 30 - moderateCount * 15);

    const upcomingAppointment = useMemo(() => {
        const rows = (appointments.data || []) as Array<Record<string, unknown>>;
        return rows.find((a) => typeof a.scheduled_at === "string") || null;
    }, [appointments.data]);

    const insights = ((risk.data?.insights || []) as Array<Record<string, unknown>>).slice(0, 3);

    const bpSeries = ((vitalsMini.data?.bp || []) as Array<Record<string, unknown>>).map((x, idx) => ({
        x: idx + 1,
        y: Number((x.value as Record<string, unknown> | undefined)?.systolic || 0)
    }));

    const glucoseSeries = ((vitalsMini.data?.glucose || []) as Array<Record<string, unknown>>).map((x, idx) => ({
        x: idx + 1,
        y: Number((x.value as Record<string, unknown> | undefined)?.value || 0)
    }));

    const onCompleteCareItem = async () => {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 1200);
    };

    const submitQuickLog = async () => {
        try {
            if (logState.type === "bp") {
                await api.post("/vitals/manual", {
                    type: "bp",
                    value: {
                        systolic: Number(logState.systolic),
                        diastolic: Number(logState.diastolic)
                    },
                    timestamp: new Date().toISOString()
                });
            }

            if (logState.type === "glucose") {
                await api.post("/vitals/manual", {
                    type: "glucose",
                    value: {
                        value: Number(logState.glucoseValue),
                        unit: "mg/dL",
                        context: logState.glucoseContext
                    },
                    timestamp: new Date().toISOString()
                });
            }
        } catch {
            // Non-blocking UX for scaffold iteration.
        }

        setLogModalOpen(false);
        setLogState(initialQuickLog);
        await refreshAll();
    };

    const isLoading =
        risk.isLoading || carePlans.isLoading || vitalsMini.isLoading || appointments.isLoading;

    if (isLoading) {
        return (
            <View className="flex-1 bg-slate-50 px-4 pt-14">
                <MotiView
                    from={{ opacity: 0.35 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "timing", duration: 600, loop: true }}
                    className="h-28 rounded-2xl bg-slate-200"
                />
                <MotiView
                    from={{ opacity: 0.35 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "timing", duration: 650, loop: true }}
                    className="mt-4 h-20 rounded-2xl bg-slate-200"
                />
                <MotiView
                    from={{ opacity: 0.35 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "timing", duration: 700, loop: true }}
                    className="mt-4 h-52 rounded-2xl bg-slate-200"
                />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            <ScrollView
                className="px-4 pt-14"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => {
                            setRefreshing(true);
                            await refreshAll();
                            setRefreshing(false);
                        }}
                    />
                }
            >
                <View className="flex-row items-start justify-between">
                    <View>
                        <Text className="text-2xl font-bold text-slate-900">{greeting}</Text>
                        <Text className="mt-1 text-sm text-slate-500">{now.toDateString()}</Text>
                    </View>
                    <TouchableOpacity className="relative rounded-full bg-white p-3 shadow-sm">
                        <Text>🔔</Text>
                        {unread > 0 ? (
                            <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1">
                                <Text className="text-xs font-semibold text-white">{unread}</Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                </View>

                <View className="mt-4">
                    <PrevntivCard>
                        <MotiView
                            from={{ scale: 0.9, opacity: 0.4 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "timing", duration: 700 }}
                            className="rounded-2xl p-4"
                            style={{ backgroundColor: scoreColor(wellnessScore) }}
                        >
                            <Text className="text-sm text-white/85">Today's Health Score</Text>
                            <View className="mt-3 flex-row items-center justify-between">
                                <View>
                                    <Text className="text-5xl font-bold text-white">{wellnessScore}</Text>
                                    <Text className="mt-1 text-xs text-white/85">Based on your vitals and care plan adherence</Text>
                                </View>
                                <MotiView
                                    from={{ rotate: "-120deg" }}
                                    animate={{ rotate: `${Math.max(-120, (wellnessScore / 100) * 240 - 120)}deg` }}
                                    transition={{ type: "timing", duration: 800 }}
                                    className="h-20 w-20 items-center justify-center rounded-full border-4 border-white/60"
                                >
                                    <View className="h-2 w-2 rounded-full bg-white" />
                                </MotiView>
                            </View>
                        </MotiView>
                    </PrevntivCard>
                </View>

                <View className="mt-5">
                    <SectionHeader title="Quick Log" subtitle="Tap a chip to log now" />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                        {quickLogTypes.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                onPress={() => {
                                    setLogState((s) => ({ ...s, type: item.key }));
                                    setLogModalOpen(true);
                                }}
                                className="mx-1 rounded-full bg-white px-4 py-2 shadow-sm"
                            >
                                <Text className="text-sm text-slate-700">{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View className="mt-5">
                    <SectionHeader title="Today's Care Plan Actions" subtitle="Complete and stay on track" />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {(carePlans.data || []).slice(0, 4).map((plan, idx) => (
                            <TouchableOpacity key={`plan-${idx}`} className="mr-3 w-56" onPress={onCompleteCareItem}>
                                <PrevntivCard>
                                    <Text className="text-sm font-semibold text-slate-900">{String((plan as { title?: string }).title || "Care action")}</Text>
                                    <Text className="mt-2 text-xs text-slate-500">Tap to mark as done</Text>
                                    <Text className="mt-3 text-lg">☐</Text>
                                </PrevntivCard>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {confetti ? (
                    <MotiView
                        from={{ opacity: 0, translateY: -6 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: "timing", duration: 220 }}
                        className="mt-3 rounded-xl bg-emerald-100 p-3"
                    >
                        <Text className="text-center text-emerald-700">🎉 Great job! Action completed.</Text>
                    </MotiView>
                ) : null}

                <View className="mt-5">
                    <SectionHeader title="Latest Insights" subtitle="AI generated observations" />
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {(insights.length ? insights : [{ message: "No critical insight today", severity: "low" }]).map((insight, idx) => {
                            const severity = String((insight as { severity?: string }).severity || "low");
                            const border = severity === "high" ? "border-red-400" : severity === "medium" ? "border-amber-400" : "border-emerald-400";
                            return (
                                <View key={`ins-${idx}`} className="mr-3 w-[320px]">
                                    <PrevntivCard>
                                        <View className={`rounded-xl border p-3 ${border}`}>
                                            <Text className="text-xs text-slate-500">Insight</Text>
                                            <Text className="mt-1 text-sm text-slate-800">{String((insight as { message?: string }).message || "Stay consistent with your logs.")}</Text>
                                        </View>
                                    </PrevntivCard>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                <View className="mt-5">
                    <SectionHeader title="Recent Vitals" subtitle="Last 7 days mini trends" />
                    <View className="gap-3">
                        <PrevntivCard>
                            <Text className="mb-2 text-sm font-semibold text-slate-900">BP (Systolic)</Text>
                            <VictoryChart theme={VictoryTheme.material} height={140} padding={{ top: 10, left: 35, right: 10, bottom: 24 }}>
                                <VictoryArea data={bpSeries.length ? bpSeries : [{ x: 1, y: 0 }]} style={{ data: { fill: "#0B6E4F55", stroke: "#0B6E4F" } }} />
                            </VictoryChart>
                            <TouchableOpacity onPress={() => router.push("/(tabs)/vitals")}><Text className="text-xs text-primary">Open detailed vitals</Text></TouchableOpacity>
                        </PrevntivCard>

                        <PrevntivCard>
                            <Text className="mb-2 text-sm font-semibold text-slate-900">Glucose</Text>
                            <VictoryChart theme={VictoryTheme.material} height={140} padding={{ top: 10, left: 35, right: 10, bottom: 24 }}>
                                <VictoryArea data={glucoseSeries.length ? glucoseSeries : [{ x: 1, y: 0 }]} style={{ data: { fill: "#E8A91755", stroke: "#E8A917" } }} />
                            </VictoryChart>
                            <TouchableOpacity onPress={() => router.push("/(tabs)/vitals")}><Text className="text-xs text-primary">Open detailed vitals</Text></TouchableOpacity>
                        </PrevntivCard>
                    </View>
                </View>

                {upcomingAppointment ? (
                    <View className="mt-5 mb-7">
                        <SectionHeader title="Upcoming Appointment" />
                        <PrevntivCard>
                            <Text className="text-sm font-semibold text-slate-900">{String((upcomingAppointment as { professional_name?: string }).professional_name || "Doctor")}</Text>
                            <Text className="mt-1 text-sm text-slate-600">{String((upcomingAppointment as { scheduled_at?: string }).scheduled_at || "")}</Text>
                            <TouchableOpacity className="mt-3 rounded-xl bg-primary px-4 py-2">
                                <Text className="text-center font-semibold text-white">Directions</Text>
                            </TouchableOpacity>
                        </PrevntivCard>
                    </View>
                ) : null}
            </ScrollView>

            <Modal visible={logModalOpen} transparent animationType="slide" onRequestClose={() => setLogModalOpen(false)}>
                <View className="flex-1 justify-end bg-black/40">
                    <View className="rounded-t-3xl bg-white p-5">
                        <Text className="text-lg font-semibold text-slate-900">Quick Log: {logState.type.toUpperCase()}</Text>

                        {logState.type === "bp" ? (
                            <View className="mt-4 gap-3">
                                <TextInput
                                    placeholder="Systolic"
                                    keyboardType="number-pad"
                                    value={logState.systolic}
                                    onChangeText={(text) => setLogState((s) => ({ ...s, systolic: text }))}
                                    className="rounded-xl border border-slate-300 px-4 py-3"
                                />
                                <TextInput
                                    placeholder="Diastolic"
                                    keyboardType="number-pad"
                                    value={logState.diastolic}
                                    onChangeText={(text) => setLogState((s) => ({ ...s, diastolic: text }))}
                                    className="rounded-xl border border-slate-300 px-4 py-3"
                                />
                            </View>
                        ) : null}

                        {logState.type === "glucose" ? (
                            <View className="mt-4 gap-3">
                                <TextInput
                                    placeholder="Glucose value"
                                    keyboardType="number-pad"
                                    value={logState.glucoseValue}
                                    onChangeText={(text) => setLogState((s) => ({ ...s, glucoseValue: text }))}
                                    className="rounded-xl border border-slate-300 px-4 py-3"
                                />
                                <View className="flex-row gap-2">
                                    {(["fasting", "post_meal"] as const).map((ctx) => (
                                        <TouchableOpacity
                                            key={ctx}
                                            className={`rounded-full px-3 py-2 ${logState.glucoseContext === ctx ? "bg-primary" : "bg-slate-100"}`}
                                            onPress={() => setLogState((s) => ({ ...s, glucoseContext: ctx }))}
                                        >
                                            <Text className={`text-xs ${logState.glucoseContext === ctx ? "text-white" : "text-slate-700"}`}>{ctx}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {logState.type !== "bp" && logState.type !== "glucose" ? (
                            <Text className="mt-4 text-sm text-slate-600">Form for {logState.type} will be added in dedicated vital logging prompt.</Text>
                        ) : null}

                        <View className="mt-5 flex-row gap-3">
                            <TouchableOpacity className="flex-1 rounded-xl border border-slate-300 px-4 py-3" onPress={() => setLogModalOpen(false)}>
                                <Text className="text-center font-semibold text-slate-700">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-1 rounded-xl bg-primary px-4 py-3" onPress={submitQuickLog}>
                                <Text className="text-center font-semibold text-white">Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
