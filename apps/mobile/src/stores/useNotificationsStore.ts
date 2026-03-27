import { create } from "zustand";

type NotificationsState = {
    unreadCount: number;
    markRead: (count?: number) => void;
    incrementUnread: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
    unreadCount: 0,
    markRead: (count = 0) => set({ unreadCount: count }),
    incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 }))
}));
