import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api } from "@/src/lib/api";

const TOKEN_KEY = "prevntiv.auth.token";
const USER_KEY = "prevntiv.auth.user";

export type AuthUser = {
    id: string;
    name?: string;
    email?: string;
    role: string;
};

type AuthState = {
    user: AuthUser | null;
    token: string | null;
    hydrated: boolean;
    hydrate: () => Promise<void>;
    login: (payload: { email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    hydrated: false,
    hydrate: async () => {
        const [token, userRaw] = await Promise.all([
            SecureStore.getItemAsync(TOKEN_KEY),
            SecureStore.getItemAsync(USER_KEY)
        ]);

        set({
            token: token || null,
            user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
            hydrated: true
        });
    },
    login: async ({ email, password }) => {
        const response = await api.post("/auth/login", { email, password });
        const payload = response.data?.data;
        const token = payload?.access_token as string;
        const user = payload?.user as AuthUser;

        if (!token || !user) {
            throw new Error("Invalid login response");
        }

        await Promise.all([
            SecureStore.setItemAsync(TOKEN_KEY, token),
            SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
        ]);

        set({ token, user });
    },
    logout: async () => {
        await Promise.all([
            SecureStore.deleteItemAsync(TOKEN_KEY),
            SecureStore.deleteItemAsync(USER_KEY)
        ]);
        set({ token: null, user: null });
    }
}));
