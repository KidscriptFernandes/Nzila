import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl border p-4", {
  variants: {
    variant: {
      default: "border-line bg-surface dark:border-night-line dark:bg-coal",
      elevated:
        "border-transparent bg-surface shadow-sm shadow-black/10 dark:bg-coal",
      outline: "border-line bg-transparent dark:border-night-line",
      gold: "border-nzila-gold bg-nzila-gold-soft dark:border-nzila-gold/40 dark:bg-coal",
      red: "border-nzila-red bg-nzila-red-soft dark:border-nzila-red/50 dark:bg-coal",
      ocean: "border-nzila-ocean bg-nzila-ocean-soft dark:border-nzila-ocean/50 dark:bg-coal",
      green:
        "border-nzila-baobab bg-nzila-baobab-soft dark:border-nzila-baobab/50 dark:bg-coal",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface CardProps extends VariantProps<typeof cardVariants> {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({ children, className, variant, onPress, accessibilityLabel }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className={cn(cardVariants({ variant }), "active:opacity-80", className)}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={cn(cardVariants({ variant }), className)}>{children}</View>;
}
