import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { RideDTO } from "@nzila/shared";
import { formatKz } from "@nzila/shared";
import { ChevronRight, MapPin } from "lucide-react-native";
import { useThemeColors } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "./ui/StatusBadge";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";

export function RideCard({
  ride,
  onPress,
  language,
  showPrice = true,
}: {
  ride: RideDTO;
  onPress?: () => void;
  language: string;
  showPrice?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Card onPress={onPress} className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Text className="font-body-semi text-xs uppercase tracking-[1px] text-ink-soft dark:text-night-muted">
            {ride.reference}
          </Text>
          {ride.priority !== "NORMAL" ? (
            <Badge
              tone="gold"
              label={t(`priority.${ride.priority}`)}
              className="py-0.5"
              textClassName="text-[9px]"
            />
          ) : null}
        </View>
        <StatusBadge status={ride.status} />
      </View>

      <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
        {formatDateTime(ride.scheduledAt, language)}
      </Text>

      <View className="gap-2">
        <View className="flex-row items-start gap-2">
          <View className="mt-1.5 h-2 w-2 rounded-full bg-nzila-ocean" />
          <Text className="flex-1 font-body text-sm text-ink dark:text-nzila-sand" numberOfLines={2}>
            {ride.origin}
          </Text>
        </View>
        <View className="ml-0.5 h-3 w-px bg-line dark:bg-night-line" />
        <View className="flex-row items-start gap-2">
          <MapPin size={14} color={colors.red} style={{ marginTop: 2 }} />
          <Text className="flex-1 font-body text-sm text-ink dark:text-nzila-sand" numberOfLines={2}>
            {ride.destination}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-line pt-3 dark:border-night-line">
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
          {t("units.passengers", { count: ride.passengers })}
        </Text>
        <View className="flex-row items-center gap-1">
          {showPrice ? (
            <Text className="font-heading-semi text-sm text-ink dark:text-nzila-sand">
              {formatKz(ride.priceKz)}
            </Text>
          ) : null}
          <ChevronRight size={16} color={colors.muted} />
        </View>
      </View>
    </Card>
  );
}
