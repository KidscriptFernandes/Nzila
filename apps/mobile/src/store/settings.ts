import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppLocale } from "@/lib/format";

export type ThemeMode = "light" | "dark" | "system";

interface SettingsState {
  theme: ThemeMode;
  language: AppLocale;
  pushEnabled: boolean;
  hydrated: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: AppLocale) => void;
  setPushEnabled: (pushEnabled: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      language: "pt-AO",
      pushEnabled: true,
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "nzila-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        pushEnabled: state.pushEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
