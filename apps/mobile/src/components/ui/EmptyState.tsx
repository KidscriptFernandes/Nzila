import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center justify-center px-6 py-10">
      {icon ? (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-nzila-gold-soft dark:bg-night-line">
          {icon}
        </View>
      ) : null}
      <Text className="text-center font-heading-semi text-lg text-ink dark:text-nzila-sand">
        {title}
      </Text>
      {body ? (
        <Text className="mt-2 max-w-[280px] text-center font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} className="mt-5" size="sm" />
      ) : null}
    </View>
  );
}
