import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AlertTriangle, WifiOff } from "lucide-react-native";
import { useConnectivity } from "@/lib/connectivity";
import { Button } from "./Button";

export function ErrorState({
  message,
  onRetry,
  retryLabel,
  title,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}) {
  const { t } = useTranslation();
  const offline = useConnectivity((state) => state.status === "offline");
  const Icon = offline ? WifiOff : AlertTriangle;

  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-1 items-center justify-center px-6 py-10"
    >
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-nzila-red-soft dark:bg-nzila-red/20">
        <Icon size={26} color="#CC092F" />
      </View>
      <Text className="text-center font-heading-semi text-lg text-ink dark:text-nzila-sand">
        {title ?? (offline ? t("errors.offlineTitle") : t("common.error"))}
      </Text>
      <Text className="mt-2 max-w-[300px] text-center font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
        {message}
      </Text>
      {onRetry ? (
        <Button
          label={retryLabel ?? t("common.retry")}
          onPress={onRetry}
          variant="outline"
          className="mt-5"
          size="sm"
        />
      ) : null}
    </View>
  );
}
