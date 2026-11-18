import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1">
        <Text className="font-heading-semi text-lg text-ink dark:text-nzila-sand">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 font-body text-xs text-ink-soft dark:text-night-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
