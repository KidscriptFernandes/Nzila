import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  className?: string;
  onBack?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  back = false,
  right,
  className,
  onBack,
}: ScreenHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View className={cn("flex-row items-center gap-3 px-5 pb-4 pt-2", className)}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack ?? (() => router.back())}
          className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-night-line dark:bg-coal"
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
      ) : null}
      <View className="flex-1">
        {title ? (
          <Text className="font-heading-semi text-xl text-ink dark:text-nzila-sand">{title}</Text>
        ) : null}
        {subtitle ? (
          <Text className="mt-1 font-body text-sm text-ink-soft dark:text-night-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
