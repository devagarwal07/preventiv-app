import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PrevntivCard } from "@/components/PrevntivCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { api } from "@/src/lib/api";
import { classifyLabValue, getRangeText } from "@/src/lib/labRanges";

type LabReportDetail = {
    id: string;
    status: string;
    file_url: string;
    signed_url?: string;
    uploaded_at: string;
    extracted_data?: Record<string, unknown> | null;
};

const colorForFlag = (flag: "normal" | "borderline" | "abnormal" | "unknown"): string => {
    if (flag === "normal") return "#166534";
    if (flag === "borderline") return "#B45309";
    if (flag === "abnormal") return "#B91C1C";
    return "#334155";
};

export default function ReportDetailScreen() {
    const params = useLocalSearchParams<{ reportId?: string }>();
    const user = useAuthStore((s) => s.user);
    const reportId = typeof params.reportId === "string" ? params.reportId : "";
    const patientId = user?.id || "";
    const [openingFile, setOpeningFile] = useState(false);

    const reportQuery = useQuery({
        queryKey: ["lab-report", patientId, reportId],
        enabled: !!patientId && !!reportId,
        queryFn: async (): Promise<LabReportDetail> => {
            const response = await api.get(`/labs/${patientId}/${reportId}`);
            return response.data?.data as LabReportDetail;
        }
    });

    const rows = useMemo(() => {
        const extracted = reportQuery.data?.extracted_data || {};
        return Object.entries(extracted).map(([name, value]) => {
            const flag = classifyLabValue(name, value);
            return {
                name,
                value: value === null || value === undefined ? "-" : String(value),
                flag,
                rangeText: getRangeText(name)
            };
        });
    }, [reportQuery.data?.extracted_data]);

    const hasAbnormal = rows.some((row) => row.flag === "abnormal");

    const openOriginalFile = async () => {
        const signedUrl = reportQuery.data?.signed_url;
        if (!signedUrl) {
            Alert.alert("File unavailable", "Please try again in a few moments.");
            return;
        }

        try {
            setOpeningFile(true);
            const extension = signedUrl.toLowerCase().includes(".pdf") ? "pdf" : "jpg";
            const localUri = `${FileSystem.cacheDirectory || ""}lab-report-${reportId}.${extension}`;
            await FileSystem.downloadAsync(signedUrl, localUri);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localUri, {
                    mimeType: extension === "pdf" ? "application/pdf" : "image/jpeg",
                    dialogTitle: "Open lab report"
                });
            } else {
                Alert.alert("Sharing unavailable", "Your device does not support file sharing.");
            }
        } catch {
            Alert.alert("Unable to open", "Could not open the report file.");
        } finally {
            setOpeningFile(false);
        }
    };

    const shareSummary = async () => {
        const title = `Lab Report Summary (${new Date(reportQuery.data?.uploaded_at || Date.now()).toDateString()})`;
        const lines = rows.slice(0, 20).map((row) => `${row.name}: ${row.value} (${row.flag})`);
        await Share.share({
            title,
            message: `${title}\n\n${lines.join("\n")}`
        });
    };

    if (reportQuery.isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50">
                <ActivityIndicator size="large" color="#0B6E4F" />
            </View>
        );
    }

    if (reportQuery.isError || !reportQuery.data) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50 px-6">
                <Text className="text-center text-slate-700">Unable to load this report right now.</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-slate-50 px-4 pt-14" contentContainerStyle={{ paddingBottom: 24 }}>
            <SectionHeader
                title="Report Details"
                subtitle={new Date(reportQuery.data.uploaded_at).toLocaleString()}
            />

            <PrevntivCard>
                <Text className="text-sm text-slate-500">Status</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">{reportQuery.data.status}</Text>

                <View className="mt-4 flex-row gap-2">
                    <TouchableOpacity
                        onPress={openOriginalFile}
                        disabled={openingFile}
                        className="rounded-full bg-primary px-4 py-2"
                    >
                        <Text className="text-xs font-semibold text-white">
                            {openingFile ? "Opening..." : "View Original File"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={shareSummary} className="rounded-full bg-slate-200 px-4 py-2">
                        <Text className="text-xs font-semibold text-slate-800">Share Summary</Text>
                    </TouchableOpacity>
                </View>
            </PrevntivCard>

            {hasAbnormal ? (
                <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <Text className="text-sm font-semibold text-red-700">Discuss with your doctor</Text>
                    <Text className="mt-1 text-xs text-red-600">
                        One or more values are outside expected range and need clinical review.
                    </Text>
                </View>
            ) : null}

            <View className="mt-4 rounded-2xl bg-white p-3">
                <Text className="mb-3 text-sm font-semibold text-slate-900">Extracted Values</Text>
                {rows.length === 0 ? (
                    <Text className="text-sm text-slate-600">No extracted values available yet.</Text>
                ) : (
                    rows.map((row) => (
                        <View key={row.name} className="mb-2 rounded-xl border border-slate-200 px-3 py-2">
                            <Text className="text-xs text-slate-500">{row.name}</Text>
                            <Text style={{ color: colorForFlag(row.flag) }} className="mt-1 text-base font-semibold">
                                {row.value}
                            </Text>
                            <Text className="mt-1 text-xs text-slate-500">Reference: {row.rangeText}</Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}
