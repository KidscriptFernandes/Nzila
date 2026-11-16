import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { NzilaMark } from "@/components/Brand";

export function LoadingScreen({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-canvas dark:bg-night">
      <NzilaMark size={44} />
      <ActivityIndicator color="#CC092F" />
      <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
        {label ?? t("common.loading")}
      </Text>
    </View>
  );
}
