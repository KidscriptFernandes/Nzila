import "../global.css";
import "react-native-reanimated";
import "@/lib/notifications";

import { useEffect } from "react";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from "@expo-google-fonts/manrope";
import { Sora_600SemiBold, Sora_700Bold } from "@expo-google-fonts/sora";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationObserver } from "@/features/auth/NotificationObserver";
import { ThemeSync } from "@/components/ThemeSync";
import { ConnectionOverlay } from "@/components/connectivity/ConnectionOverlay";
import { startConnectivityWatcher } from "@/lib/connectivity";
import i18n from "@/lib/i18n";
import { queryClient, queryPersister } from "@/lib/query";
import { useThemeColors } from "@/lib/theme";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";

void SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
  });
  const initialize = useSession((state) => state.initialize);
  const language = useSettings((state) => state.language);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => startConnectivityWatcher(), []);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        },
      }}
    >
      <SafeAreaProvider>
        <ThemeSync />
        <NotificationObserver />
        <RootNavigator />
        <ConnectionOverlay />
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

function RootNavigator() {
  const colors = useThemeColors();

  return (
    <>
      <StatusBar style={colors.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
