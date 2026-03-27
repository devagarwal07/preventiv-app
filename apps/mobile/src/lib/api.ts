import axios from "axios";
import { useAuthStore } from "@/src/stores/useAuthStore";

const API_BASE_URL =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        ?.EXPO_PUBLIC_API_URL ||
    "http://localhost:3001";

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
