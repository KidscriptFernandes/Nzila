import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OfflineScreen } from "./OfflineScreen";
import { useConnectivity, type ConnectivityStatus } from "@/lib/connectivity";

export function ConnectionOverlay() {
  const { t } = useTranslation();
  const status = useConnectivity((state) => state.status);
  const insets = useSafeAreaInsets();
  const [restored, setRestored] = useState(false);
  const previous = useRef<ConnectivityStatus>(status);

  useEffect(() => {
    if (previous.current === "offline" && status === "online") {
      setRestored(true);
      previous.current = status;
      const timer = setTimeout(() => setRestored(false), 3200);
      return () => clearTimeout(timer);
    }
    previous.current = status;
    return undefined;
  }, [status]);

  return (
    <>
      {status === "offline" ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50, elevation: 50 }]}>
          <OfflineScreen />
        </View>
      ) : null}

      {restored && status === "online" ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.banner, { top: insets.top + 8 }]}
          className="flex-row items-center gap-2 rounded-2xl bg-ink px-4 py-3 dark:bg-nzila-sand"
        >
          <CheckCircle2 size={18} color="#FFCB00" />
          <Text className="flex-1 font-body-semi text-sm text-nzila-sand dark:text-ink">
            {t("offline.restored")}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 60,
    elevation: 60,
    shadowColor: "#0D0D0D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
});
