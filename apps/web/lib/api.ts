import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

api.interceptors.request.use(async (config) => {
    const session = await getSession();
    const token = session?.accessToken || session?.user?.accessToken;

    if (token) {
        config.headers.authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error?.response?.status === 401) {
            await signOut({ callbackUrl: "/login" });
        }
        return Promise.reject(error);
    }
);

export const apiClient = {
    getPatientEhr: (patientId: string) => api.get(`/patients/${patientId}/ehr`),
    getAppointments: (params?: Record<string, string>) => api.get("/appointments", { params }),
    getCarePlans: (patientId: string) => api.get(`/care-plans/${patientId}`),
    getVitals: (patientId: string) => api.get(`/vitals/${patientId}`),
    getLabs: (patientId: string) => api.get(`/labs/${patientId}`)
};
