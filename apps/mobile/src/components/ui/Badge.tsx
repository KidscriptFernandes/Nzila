import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("flex-row items-center gap-1 rounded-full px-2.5 py-1", {
  variants: {
    tone: {
      neutral: "bg-nzila-sand dark:bg-night-line",
      red: "bg-nzila-red-soft dark:bg-nzila-red/20",
      gold: "bg-nzila-gold-soft dark:bg-nzila-gold/20",
      ocean: "bg-nzila-ocean-soft dark:bg-nzila-ocean/20",
      green: "bg-nzila-baobab-soft dark:bg-nzila-baobab/20",
      clay: "bg-nzila-clay-soft dark:bg-nzila-clay/20",
      dark: "bg-nzila-black dark:bg-nzila-sand",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

const textVariants = cva("font-body-semi text-[11px]", {
  variants: {
    tone: {
      neutral: "text-ink-soft dark:text-night-muted",
      red: "text-nzila-red",
      gold: "text-[#7A5C00] dark:text-nzila-gold",
      ocean: "text-nzila-ocean dark:text-[#7FD0DA]",
      green: "text-nzila-baobab dark:text-[#8FD3A9]",
      clay: "text-nzila-clay dark:text-[#E6A18F]",
      dark: "text-nzila-sand dark:text-nzila-black",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  icon?: ReactNode;
  className?: string;
  textClassName?: string;
}

export function Badge({ label, icon, tone, className, textClassName }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ tone }), className)}>
      {icon}
      <Text className={cn(textVariants({ tone }), textClassName)}>{label}</Text>
    </View>
  );
}
