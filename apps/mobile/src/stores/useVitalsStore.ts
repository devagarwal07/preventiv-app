import { create } from "zustand";

type TodaysSummary = {
    bp?: { systolic: number; diastolic: number };
    glucose?: { value: number; context: "fasting" | "post_meal" | "random" };
    hr?: { bpm: number };
};

type VitalsState = {
    todaysSummary: TodaysSummary;
    addVital: (type: string, value: Record<string, unknown>) => void;
};

export const useVitalsStore = create<VitalsState>((set) => ({
    todaysSummary: {},
    addVital: (type, value) => {
        set((state) => ({
            todaysSummary: {
                ...state.todaysSummary,
                [type]: value
            }
        }));
    }
}));
