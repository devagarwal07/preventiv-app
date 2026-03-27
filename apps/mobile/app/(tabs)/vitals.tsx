import BottomSheet from "@gorhom/bottom-sheet";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { VictoryAxis, VictoryChart, VictoryLine, VictoryScatter, VictoryTheme } from "victory";
import { SectionHeader } from "@/components/SectionHeader";
import { api } from "@/src/lib/api";

type VitalType = "bp" | "glucose" | "hr" | "spo2" | "weight" | "steps" | "sleep" | "hrv";
type RangeType = "7d" | "30d" | "3m";

const vitalTypes: VitalType[] = ["bp", "glucose", "hr", "spo2", "weight", "steps", "sleep", "hrv"];

const rangeToDays = (range: RangeType): number => {
    if (range === "7d") return 7;
    if (range === "30d") return 30;
    return 90;
};

const normalRange = (type: VitalType): [number, number] => {
    switch (type) {
        case "bp":
            return [90, 120];
        case "glucose":
            return [70, 140];
        case "hr":
            return [60, 100];
        case "spo2":
            return [94, 100];
        case "weight":
            return [50, 80];
        case "steps":
            return [6000, 12000];
        case "sleep":
            return [60, 100];
        case "hrv":
            return [30, 100];
    }
};

const toValue = (row: Record<string, unknown>, type: VitalType): number => {
    const value = (row.value || {}) as Record<string, unknown>;
    if (type === "bp") return Number(value.systolic || 0);
    if (type === "glucose") return Number(value.value || 0);
    if (type === "hr") return Number(value.bpm || 0);
    if (type === "spo2") return Number(value.percent || 0);
    if (type === "weight") return Number(value.kg || value.value || 0);
    if (type === "steps") return Number(value.count || 0);
    if (type === "sleep") return Number(value.quality_score || 0);
    return Number(value.ms || value.value || 0);
};

const iconForSource = (source: string): string => {
    if (source === "wearable") return "⌚";
    if (source === "manual") return "✏️";
    return "🔬";
};

export default function VitalsTab() {
    const queryClient = useQueryClient();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [selectedType, setSelectedType] = useState<VitalType>("bp");
    const [range, setRange] = useState<RangeType>("30d");
    const [selectedPoint, setSelectedPoint] = useState<Record<string, unknown> | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    const [bpSystolic, setBpSystolic] = useState("");
    const [bpDiastolic, setBpDiastolic] = useState("");
    const [glucoseValue, setGlucoseValue] = useState("");
    const [glucoseContext, setGlucoseContext] = useState<"fasting" | "post_meal" | "random">("fasting");
    const [singleValue, setSingleValue] = useState("");

    const historyQuery = useInfiniteQuery({
        queryKey: ["mobile-vitals", selectedType, range],
        queryFn: async ({ pageParam = 1 }) => {
            try {
                const res = await api.get("/vitals/me", {
                    params: {
                        type: selectedType,
                        page: pageParam,
                        limit: 20,
                        from: new Date(Date.now() - rangeToDays(range) * 86400000).toISOString(),
                        to: new Date().toISOString()
                    }
                });

                const data = (res.data?.data?.rows || []) as Array<Record<string, unknown>>;
                const meta = (res.data?.meta || {}) as { totalPages?: number; page?: number };
                return { data, meta };
            } catch {
                return { data: [] as Array<Record<string, unknown>>, meta: { totalPages: 1, page: Number(pageParam) } };
            }
        },
        getNextPageParam: (lastPage) => {
            const page = Number(lastPage.meta.page || 1);
            const totalPages = Number(lastPage.meta.totalPages || 1);
            return page < totalPages ? page + 1 : undefined;
        },
        initialPageParam: 1
    });

    const rows = useMemo(
        () => (historyQuery.data?.pages || []).flatMap((p) => p.data),
        [historyQuery.data?.pages]
    );

    const chartData = useMemo(
        () =>
            rows
                .slice(0, 30)
                .reverse()
                .map((row, idx) => ({
                    x: idx + 1,
                    y: toValue(row, selectedType),
                    source: String(row.source || "manual"),
                    is_anomaly: Boolean(row.is_anomaly),
                    recorded_at: String(row.recorded_at || "")
                })),
        [rows, selectedType]
    );

    const [nMin, nMax] = normalRange(selectedType);
    const baseline = (nMin + nMax) / 2;

    const stats = useMemo(() => {
        const values = chartData.map((x) => x.y).filter((x) => Number.isFinite(x));
        if (!values.length) {
            return { avg: 0, min: 0, max: 0, trend: 0 };
        }

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const half = Math.max(1, Math.floor(values.length / 2));
        const olderAvg = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
        const trend = olderAvg ? ((avg - olderAvg) / olderAvg) * 100 : 0;

        return { avg, min, max, trend };
    }, [chartData]);

    const openBottomSheet = () => {
        bottomSheetRef.current?.expand();
    };

    const saveReading = async () => {
        let payload: Record<string, unknown> = {};

        if (selectedType === "bp") {
            payload = {
                systolic: Number(bpSystolic),
                diastolic: Number(bpDiastolic)
            };
        } else if (selectedType === "glucose") {
            payload = {
                value: Number(glucoseValue),
                unit: "mg/dL",
                context: glucoseContext
            };
        } else if (selectedType === "hr") {
            payload = { bpm: Number(singleValue) };
        } else if (selectedType === "spo2") {
            payload = { percent: Number(singleValue) };
        } else if (selectedType === "weight") {
            payload = { kg: Number(singleValue) };
        } else if (selectedType === "steps") {
            payload = { count: Number(singleValue) };
        } else if (selectedType === "sleep") {
            payload = { quality_score: Number(singleValue), duration_minutes: 420, deep_sleep_minutes: 90, rem_minutes: 70 };
        } else {
            payload = { ms: Number(singleValue) };
        }

        try {
            await api.post("/vitals/manual", {
                type: selectedType,
                value: payload,
                timestamp: new Date().toISOString()
            });
            await queryClient.invalidateQueries({ queryKey: ["mobile-vitals", selectedType, range] });
            bottomSheetRef.current?.close();
            setBpSystolic("");
            setBpDiastolic("");
            setGlucoseValue("");
            setSingleValue("");
        } catch {
            // Keep optimistic UX during scaffold stage.
        }
    };

    const syncWearables = async () => {
        setSyncing(true);
        try {
            await api.post("/vitals/sync/google-fit", {
                access_token: "demo-access-token",
                from: new Date(Date.now() - 7 * 86400000).toISOString(),
                to: new Date().toISOString()
            });
            setLastSyncedAt(new Date().toISOString());
            await queryClient.invalidateQueries({ queryKey: ["mobile-vitals", selectedType, range] });
        } catch {
            // Ignore sync errors in scaffold mode.
        } finally {
            setSyncing(false);
        }
    };

    return (
        <View className="flex-1 bg-slate-50 px-4 pt-14">
            <View className="mb-2 flex-row items-center justify-between">
                <SectionHeader title="Vitals" subtitle="Log and review your readings" />
                <TouchableOpacity className="rounded-full bg-white px-3 py-2" onPress={syncWearables}>
                    {syncing ? <ActivityIndicator color="#0B6E4F" /> : <Text className="text-xs text-primary">Sync Wearable</Text>}
                </TouchableOpacity>
            </View>

            <Text className="mb-2 text-xs text-slate-500">Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}</Text>

            <FlatList
                data={rows}
                keyExtractor={(item, idx) => `${String(item.id || idx)}`}
                ListHeaderComponent={
                    <>
                        <View className="mb-3">
                            <FlatList
                                horizontal
                                data={vitalTypes}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => setSelectedType(item)}
                                        className={`mr-2 rounded-full px-4 py-2 ${item === selectedType ? "bg-primary" : "bg-white"}`}
                                    >
                                        <Text className={`text-xs font-semibold ${item === selectedType ? "text-white" : "text-slate-700"}`}>{item.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                )}
                                showsHorizontalScrollIndicator={false}
                            />
                        </View>

                        <View className="mb-3 flex-row gap-2">
                            {(["7d", "30d", "3m"] as RangeType[]).map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setRange(r)}
                                    className={`rounded-full px-3 py-1.5 ${r === range ? "bg-primary" : "bg-white"}`}
                                >
                                    <Text className={`text-xs ${r === range ? "text-white" : "text-slate-700"}`}>{r.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="mb-3 rounded-2xl bg-white p-3">
                            <VictoryChart theme={VictoryTheme.material} height={220} domainPadding={16}>
                                <VictoryAxis dependentAxis />
                                <VictoryAxis />
                                <VictoryLine data={[{ x: 1, y: baseline }, { x: Math.max(2, chartData.length), y: baseline }]} style={{ data: { stroke: "#E8A917", strokeDasharray: "4,4" } }} />
                                <VictoryLine data={[{ x: 1, y: nMin }, { x: Math.max(2, chartData.length), y: nMin }]} style={{ data: { stroke: "#BBF7D0" } }} />
                                <VictoryLine data={[{ x: 1, y: nMax }, { x: Math.max(2, chartData.length), y: nMax }]} style={{ data: { stroke: "#BBF7D0" } }} />
                                <VictoryLine data={chartData.length ? chartData : [{ x: 1, y: 0 }]} style={{ data: { stroke: "#0B6E4F", strokeWidth: 2 } }} />
                                <VictoryScatter
                                    data={chartData.length ? chartData : [{ x: 1, y: 0, source: "manual", recorded_at: "", is_anomaly: false }]}
                                    size={4}
                                    style={{
                                        data: {
                                            fill: ({ datum }: { datum?: { is_anomaly?: boolean } }) =>
                                                datum?.is_anomaly ? "#DC2626" : "#0B6E4F"
                                        }
                                    }}
                                    events={[
                                        {
                                            target: "data",
                                            eventHandlers: {
                                                onPressIn: () => {
                                                    return [
                                                        {
                                                            target: "data",
                                                            mutation: (props) => {
                                                                setSelectedPoint((props.datum || null) as Record<string, unknown> | null);
                                                                return props;
                                                            }
                                                        }
                                                    ];
                                                }
                                            }
                                        }
                                    ]}
                                />
                            </VictoryChart>
                        </View>

                        <View className="mb-3 flex-row justify-between rounded-2xl bg-white p-3">
                            <View>
                                <Text className="text-xs text-slate-500">Avg</Text>
                                <Text className="text-base font-semibold text-slate-900">{stats.avg.toFixed(1)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs text-slate-500">Min</Text>
                                <Text className="text-base font-semibold text-slate-900">{stats.min.toFixed(1)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs text-slate-500">Max</Text>
                                <Text className="text-base font-semibold text-slate-900">{stats.max.toFixed(1)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs text-slate-500">Trend</Text>
                                <Text className="text-base font-semibold text-primary">{stats.trend >= 0 ? "↑" : "↓"}{Math.abs(stats.trend).toFixed(1)}%</Text>
                            </View>
                        </View>

                        <SectionHeader title="History" subtitle="Date/time · value · source" />
                    </>
                }
                renderItem={({ item }) => {
                    const value = toValue(item, selectedType);
                    const source = String(item.source || "manual");
                    const rowAnomaly = Boolean(item.is_anomaly);
                    return (
                        <View className={`mb-2 rounded-xl p-3 ${rowAnomaly ? "bg-red-100" : "bg-white"}`}>
                            <Text className="text-xs text-slate-500">{new Date(String(item.recorded_at || new Date().toISOString())).toLocaleString()}</Text>
                            <Text className="mt-1 text-sm font-semibold text-slate-900">{value} {iconForSource(source)}</Text>
                            {rowAnomaly ? <Text className="mt-1 text-xs text-red-700">⚠ anomaly detected</Text> : null}
                        </View>
                    );
                }}
                onEndReached={() => {
                    if (historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
                        void historyQuery.fetchNextPage();
                    }
                }}
                onEndReachedThreshold={0.6}
                ListFooterComponent={historyQuery.isFetchingNextPage ? <ActivityIndicator color="#0B6E4F" /> : null}
            />

            <TouchableOpacity
                className="absolute bottom-6 right-6 rounded-full bg-primary px-5 py-4 shadow"
                onPress={openBottomSheet}
            >
                <Text className="font-semibold text-white">+ Log New Reading</Text>
            </TouchableOpacity>

            <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={["48%", "72%"]} enablePanDownToClose>
                <View className="px-4">
                    <Text className="text-lg font-semibold text-slate-900">Log {selectedType.toUpperCase()}</Text>

                    {selectedType === "bp" ? (
                        <>
                            <TextInput value={bpSystolic} onChangeText={setBpSystolic} keyboardType="number-pad" placeholder="Systolic" className="mt-4 rounded-xl border border-slate-300 px-4 py-3" />
                            <TextInput value={bpDiastolic} onChangeText={setBpDiastolic} keyboardType="number-pad" placeholder="Diastolic" className="mt-3 rounded-xl border border-slate-300 px-4 py-3" />
                        </>
                    ) : null}

                    {selectedType === "glucose" ? (
                        <>
                            <TextInput value={glucoseValue} onChangeText={setGlucoseValue} keyboardType="number-pad" placeholder="Glucose value" className="mt-4 rounded-xl border border-slate-300 px-4 py-3" />
                            <View className="mt-3 flex-row gap-2">
                                {(["fasting", "post_meal", "random"] as const).map((ctx) => (
                                    <TouchableOpacity key={ctx} onPress={() => setGlucoseContext(ctx)} className={`rounded-full px-3 py-2 ${glucoseContext === ctx ? "bg-primary" : "bg-slate-100"}`}>
                                        <Text className={`text-xs ${glucoseContext === ctx ? "text-white" : "text-slate-700"}`}>{ctx}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    ) : null}

                    {selectedType !== "bp" && selectedType !== "glucose" ? (
                        <TextInput value={singleValue} onChangeText={setSingleValue} keyboardType="number-pad" placeholder="Value" className="mt-4 rounded-xl border border-slate-300 px-4 py-3" />
                    ) : null}

                    <TouchableOpacity className="mt-5 rounded-xl bg-primary px-4 py-3" onPress={saveReading}>
                        <Text className="text-center font-semibold text-white">Submit</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

            <Modal visible={Boolean(selectedPoint)} transparent animationType="fade" onRequestClose={() => setSelectedPoint(null)}>
                <View className="flex-1 items-center justify-center bg-black/35 px-8">
                    <View className="w-full rounded-2xl bg-white p-4">
                        <Text className="text-sm font-semibold text-slate-900">Reading Details</Text>
                        <Text className="mt-2 text-sm text-slate-700">Value: {String(selectedPoint?.y || "-")}</Text>
                        <Text className="text-sm text-slate-700">Source: {String(selectedPoint?.source || "manual")}</Text>
                        <Text className="text-sm text-slate-700">Time: {String(selectedPoint?.recorded_at || "-")}</Text>
                        <TouchableOpacity className="mt-4 rounded-xl bg-primary px-4 py-2" onPress={() => setSelectedPoint(null)}>
                            <Text className="text-center font-semibold text-white">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
