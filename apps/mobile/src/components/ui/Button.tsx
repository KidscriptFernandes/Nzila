import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80",
  {
    variants: {
      variant: {
        primary: "bg-nzila-red",
        secondary: "bg-nzila-black dark:bg-nzila-sand",
        gold: "bg-nzila-gold",
        outline:
          "border border-line bg-surface dark:border-night-line dark:bg-coal",
        ghost: "bg-transparent",
        danger: "bg-nzila-red",
      },
      size: {
        sm: "h-10 px-4",
        md: "h-12 px-5",
        lg: "h-14 px-6",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

const textVariants = cva("text-center font-body-semi", {
  variants: {
    variant: {
      primary: "text-white",
      secondary: "text-nzila-sand dark:text-nzila-black",
      gold: "text-nzila-black",
      outline: "text-ink dark:text-nzila-sand",
      ghost: "text-ink dark:text-nzila-sand",
      danger: "text-white",
    },
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-base",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  textClassName?: string;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant,
  size,
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  textClassName,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        isDisabled && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "gold" || variant === "outline" ? "#0D0D0D" : "#FFFFFF"}
          size="small"
        />
      ) : (
        leftIcon
      )}
      <Text className={cn(textVariants({ variant, size }), textClassName)}>{label}</Text>
      {!loading ? rightIcon : null}
    </Pressable>
  );
}
