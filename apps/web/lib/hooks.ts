"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api";

const safeData = async <T>(promise: Promise<{ data: { data: T } }>, fallback: T): Promise<T> => {
    try {
        const res = await promise;
        return res.data?.data ?? fallback;
    } catch {
        return fallback;
    }
};

export const usePatients = () =>
    useQuery({
        queryKey: ["patients"],
        queryFn: () =>
            safeData(
                apiClient.getAppointments().then((x) => ({ data: { data: (x.data?.data || []) as Array<Record<string, unknown>> } })),
                [] as Array<Record<string, unknown>>
            )
    });

export const usePatientEHR = (patientId: string) =>
    useQuery({
        queryKey: ["patient-ehr", patientId],
        queryFn: () => safeData(apiClient.getPatientEhr(patientId), {} as Record<string, unknown>)
    });

export const useVitals = (patientId: string, options?: Record<string, string>) =>
    useQuery({
        queryKey: ["vitals", patientId, options],
        queryFn: () => safeData(apiClient.getVitals(patientId), [] as Array<Record<string, unknown>>)
    });

export const useCarePlans = (patientId: string) =>
    useQuery({
        queryKey: ["care-plans", patientId],
        queryFn: () => safeData(apiClient.getCarePlans(patientId), [] as Array<Record<string, unknown>>)
    });

export const useLabs = (patientId: string) =>
    useQuery({
        queryKey: ["labs", patientId],
        queryFn: () => safeData(apiClient.getLabs(patientId), [] as Array<Record<string, unknown>>)
    });

export const useAppointments = (filters?: Record<string, string>) =>
    useQuery({
        queryKey: ["appointments", filters],
        queryFn: () => safeData(apiClient.getAppointments(filters), [] as Array<Record<string, unknown>>)
    });
