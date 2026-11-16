import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { RidePriority } from "@nzila/shared";
import { cn } from "@/lib/utils";

const COLORS: Record<RidePriority, { dot: string; active: string; activeText: string }> = {
  NORMAL: {
    dot: "#0E6F7C",
    active: "border-nzila-ocean bg-nzila-ocean-soft dark:bg-nzila-ocean/20",
    activeText: "text-nzila-ocean dark:text-[#7FD0DA]",
  },
  PRIORIDADE: {
    dot: "#B8860B",
    active: "border-nzila-gold bg-nzila-gold-soft dark:bg-nzila-gold/20",
    activeText: "text-[#7A5C00] dark:text-nzila-gold",
  },
  URGENTE: {
    dot: "#CC092F",
    active: "border-nzila-red bg-nzila-red-soft dark:bg-nzila-red/20",
    activeText: "text-nzila-red",
  },
};

export function PriorityChip({
  priority,
  selected,
  onPress,
}: {
  priority: RidePriority;
  selected: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const colors = COLORS[priority];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-2 rounded-full border px-4 py-2.5",
        selected
          ? colors.active
          : "border-line bg-surface dark:border-night-line dark:bg-coal",
      )}
    >
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.dot }} />
      <Text
        className={cn(
          "font-body-semi text-sm",
          selected ? colors.activeText : "text-ink-soft dark:text-night-muted",
        )}
      >
        {t(`priority.${priority}`)}
      </Text>
    </Pressable>
  );
}
