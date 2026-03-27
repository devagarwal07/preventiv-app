import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { MotiView } from "moti";
import { PrevntivCard } from "@/components/PrevntivCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { api } from "@/src/lib/api";

type LabReport = {
    id: string;
    uploaded_at: string;
    status: "processing" | "processed" | "extraction_failed";
    extracted_data?: Record<string, unknown> | null;
};

type PickerAsset = {
    uri: string;
    name: string;
    mimeType: string;
};

const statusStyles: Record<LabReport["status"], { text: string; bg: string; fg: string }> = {
    processing: { text: "Processing", bg: "#FEF3C7", fg: "#92400E" },
    processed: { text: "Processed", bg: "#DCFCE7", fg: "#166534" },
    extraction_failed: { text: "Failed", bg: "#FEE2E2", fg: "#991B1B" }
};

const topChips = (data?: Record<string, unknown> | null): Array<{ key: string; value: string }> => {
    if (!data) {
        return [];
    }

    return Object.entries(data)
        .filter(([, value]) => ["number", "string"].includes(typeof value))
        .slice(0, 3)
        .map(([key, value]) => ({ key, value: String(value) }));
};

export default function ReportsTab() {
    const user = useAuthStore((s) => s.user);
    const patientId = user?.id || "";

    const [actionSheetOpen, setActionSheetOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<PickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showProcessingPulse, setShowProcessingPulse] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const reportsQuery = useQuery({
        queryKey: ["lab-reports", patientId],
        enabled: !!patientId,
        queryFn: async (): Promise<LabReport[]> => {
            const response = await api.get(`/labs/${patientId}`);
            return (response.data?.data || []) as LabReport[];
        },
        refetchInterval: (query) => {
            const rows = (query.state.data || []) as LabReport[];
            return rows.some((row) => row.status === "processing") ? 8000 : false;
        }
    });

    const latestUploadDate = useMemo(() => {
        const first = reportsQuery.data?.[0];
        if (!first?.uploaded_at) {
            return null;
        }
        return new Date(first.uploaded_at);
    }, [reportsQuery.data]);

    const needsReminder = useMemo(() => {
        if (!latestUploadDate) {
            return true;
        }
        return Date.now() - latestUploadDate.getTime() > 90 * 24 * 60 * 60 * 1000;
    }, [latestUploadDate]);

    const pickFromCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            setActionSheetOpen(false);
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8
        });
        setActionSheetOpen(false);

        if (result.canceled || !result.assets?.length) {
            return;
        }

        const asset = result.assets[0];
        setSelectedAsset({
            uri: asset.uri,
            name: asset.fileName || `capture-${Date.now()}.jpg`,
            mimeType: asset.mimeType || "image/jpeg"
        });
    };

    const pickFromGallery = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setActionSheetOpen(false);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85
        });
        setActionSheetOpen(false);

        if (result.canceled || !result.assets?.length) {
            return;
        }

        const asset = result.assets[0];
        setSelectedAsset({
            uri: asset.uri,
            name: asset.fileName || `gallery-${Date.now()}.jpg`,
            mimeType: asset.mimeType || "image/jpeg"
        });
    };

    const pickPdf = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: "application/pdf",
            copyToCacheDirectory: true,
            multiple: false
        });
        setActionSheetOpen(false);

        if (result.canceled || !result.assets?.length) {
            return;
        }

        const asset = result.assets[0];
        setSelectedAsset({
            uri: asset.uri,
            name: asset.name || `report-${Date.now()}.pdf`,
            mimeType: asset.mimeType || "application/pdf"
        });
    };

    const uploadSelected = async () => {
        if (!selectedAsset || !patientId) {
            return;
        }

        const formData = new FormData();
        formData.append("patient_id", patientId);
        formData.append("file", {
            uri: selectedAsset.uri,
            name: selectedAsset.name,
            type: selectedAsset.mimeType
        } as never);

        try {
            setUploading(true);
            setUploadProgress(0);

            await api.post("/labs/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    setUploadProgress(Math.round((progressEvent.loaded * 100) / total));
                }
            });

            setSelectedAsset(null);
            setShowProcessingPulse(true);
            await reportsQuery.refetch();

            setTimeout(() => {
                setShowProcessingPulse(false);
            }, 5000);
        } catch {
            // Upload error feedback can be expanded in later prompt iterations.
        } finally {
            setUploading(false);
        }
    };

    return (
        <View className="flex-1 bg-slate-50 px-4 pt-14">
            <SectionHeader title="Lab Reports" subtitle="Upload and review your reports" />

            <TouchableOpacity
                onPress={() => setActionSheetOpen(true)}
                className="mb-3 rounded-2xl bg-primary px-4 py-3"
            >
                <Text className="text-center text-sm font-semibold text-white">Upload Report</Text>
            </TouchableOpacity>

            {selectedAsset ? (
                <PrevntivCard>
                    <Text className="text-xs text-slate-500">Selected file preview</Text>
                    <Text className="mt-1 text-sm font-semibold text-slate-900">{selectedAsset.name}</Text>
                    <Text className="mt-1 text-xs text-slate-500">{selectedAsset.mimeType.includes("pdf") ? "PDF" : "Image"}</Text>

                    {uploading ? (
                        <View className="mt-3">
                            <View className="h-2 overflow-hidden rounded-full bg-slate-200">
                                <View
                                    className="h-full bg-primary"
                                    style={{ width: `${Math.max(2, uploadProgress)}%` }}
                                />
                            </View>
                            <Text className="mt-1 text-xs text-slate-600">Uploading {uploadProgress}%</Text>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={uploadSelected} className="mt-3 rounded-full bg-slate-900 px-4 py-2">
                            <Text className="text-center text-xs font-semibold text-white">Start Upload</Text>
                        </TouchableOpacity>
                    )}
                </PrevntivCard>
            ) : null}

            {showProcessingPulse ? (
                <MotiView
                    from={{ opacity: 0.45, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "timing", duration: 650, loop: true }}
                    className="mb-3 mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                >
                    <Text className="text-sm font-semibold text-amber-800">Processing...</Text>
                    <Text className="mt-1 text-xs text-amber-700">We are extracting values from your latest upload.</Text>
                </MotiView>
            ) : null}

            {needsReminder ? (
                <View className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <Text className="text-sm font-semibold text-blue-800">Time for your regular labs</Text>
                    <Text className="mt-1 text-xs text-blue-700">You have no recent lab upload in the last 90 days.</Text>
                </View>
            ) : null}

            {reportsQuery.isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0B6E4F" />
                </View>
            ) : (
                <FlatList
                    data={reportsQuery.data || []}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={async () => {
                                setRefreshing(true);
                                await reportsQuery.refetch();
                                setRefreshing(false);
                            }}
                        />
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => {
                        const chips = topChips(item.extracted_data);
                        const status = statusStyles[item.status];

                        return (
                            <TouchableOpacity
                                onPress={() => router.push(`/reports/${item.id}` as never)}
                                className="mb-3 rounded-2xl bg-white p-3"
                            >
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-base font-semibold text-slate-900">
                                        {String(item.id).slice(0, 8).toUpperCase()} • {item.status === "processed" ? "📄" : "🖼️"}
                                    </Text>
                                    <View className="rounded-full px-2 py-1" style={{ backgroundColor: status.bg }}>
                                        <Text className="text-xs font-semibold" style={{ color: status.fg }}>
                                            {status.text}
                                        </Text>
                                    </View>
                                </View>

                                <Text className="mt-1 text-xs text-slate-500">
                                    Uploaded {new Date(item.uploaded_at).toLocaleString()}
                                </Text>

                                {chips.length > 0 ? (
                                    <View className="mt-2 flex-row flex-wrap">
                                        {chips.map((chip) => (
                                            <View key={chip.key} className="mr-2 mt-1 rounded-full bg-slate-100 px-2.5 py-1">
                                                <Text className="text-xs text-slate-700">{chip.key}: {chip.value}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View className="items-center rounded-2xl bg-white px-4 py-8">
                            <Text className="text-sm text-slate-700">No reports yet. Upload your first lab file.</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={actionSheetOpen} transparent animationType="fade" onRequestClose={() => setActionSheetOpen(false)}>
                <View className="flex-1 items-center justify-end bg-black/35 p-4">
                    <View className="w-full rounded-2xl bg-white p-3">
                        <Text className="mb-2 text-sm font-semibold text-slate-900">Upload Lab Report</Text>
                        <TouchableOpacity onPress={pickFromCamera} className="rounded-xl px-3 py-3">
                            <Text className="text-sm text-slate-800">Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickFromGallery} className="rounded-xl px-3 py-3">
                            <Text className="text-sm text-slate-800">Choose from Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickPdf} className="rounded-xl px-3 py-3">
                            <Text className="text-sm text-slate-800">Upload PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setActionSheetOpen(false)} className="mt-1 rounded-xl px-3 py-3">
                            <Text className="text-center text-sm font-semibold text-slate-500">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
