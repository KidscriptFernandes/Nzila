import { useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { RefreshCw, WifiOff } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { refreshConnectivity } from "@/lib/connectivity";
import { useThemeColors } from "@/lib/theme";

export function OfflineScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const online = await refreshConnectivity();
      if (!online) setFeedback(t("offline.stillOffline"));
    } catch {
      setFeedback(t("offline.stillOffline"));
    } finally {
      setChecking(false);
    }
  };

  const tips = [t("offline.tip1"), t("offline.tip2"), t("offline.tip3")];

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      className="flex-1 bg-canvas dark:bg-night"
    >
      <View className="items-center px-6 pt-6">
        <Wordmark />
      </View>

      <View className="flex-1 justify-center px-6 pb-4">
        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-nzila-red-soft dark:bg-nzila-red/20">
            <WifiOff size={36} color={colors.red} />
          </View>
          <Text
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            className="mt-6 text-center font-heading text-2xl leading-8 tracking-tight text-ink dark:text-nzila-sand"
          >
            {t("offline.title")}
          </Text>
          <Text className="mt-3 max-w-[320px] text-center font-body text-sm leading-6 text-ink-soft dark:text-night-muted">
            {t("offline.body")}
          </Text>
        </View>

        <View className="mt-8 rounded-3xl border border-line bg-surface p-5 dark:border-night-line dark:bg-coal">
          <Text className="font-body-semi text-[11px] uppercase tracking-[1.5px] text-ink-soft dark:text-night-muted">
            {t("offline.tipsTitle")}
          </Text>
          {tips.map((tip, index) => (
            <View key={tip} className="mt-3 flex-row items-start gap-3">
              <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-nzila-sand dark:bg-night-line">
                <Text className="font-body-semi text-[11px] text-ink-soft dark:text-night-muted">
                  {index + 1}
                </Text>
              </View>
              <Text className="flex-1 font-body text-sm leading-5 text-ink dark:text-nzila-sand">
                {tip}
              </Text>
            </View>
          ))}
        </View>

        <Button
          label={checking ? t("offline.checking") : t("offline.retry")}
          onPress={() => void check()}
          loading={checking}
          size="lg"
          fullWidth
          className="mt-6"
          leftIcon={<RefreshCw size={18} color="#FFFFFF" />}
        />

        {feedback ? (
          <Text
            accessibilityLiveRegion="polite"
            className="mt-3 text-center font-body text-sm leading-5 text-nzila-red"
          >
            {feedback}
          </Text>
        ) : null}

        <Text className="mt-4 text-center font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
          {t("offline.autoReconnect")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
