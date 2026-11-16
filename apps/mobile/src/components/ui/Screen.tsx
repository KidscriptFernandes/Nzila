import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

interface ScreenProps {
  children: ReactNode;
  className?: string;
  contentContainerClassName?: string;
  scroll?: boolean;
  edges?: Array<"top" | "bottom" | "left" | "right">;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboard?: boolean;
}

export function Screen({
  children,
  className,
  contentContainerClassName,
  scroll = false,
  edges = ["top", "left", "right"],
  refreshing,
  onRefresh,
  keyboard = false,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn("pb-10", contentContainerClassName)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor="#CC092F" />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn("flex-1", contentContainerClassName)}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-canvas dark:bg-night", className)}>
      {keyboard ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
