import { forwardRef, useState, type ComponentRef, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  containerClassName?: string;
  inputClassName?: string;
}

export const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(function Input(
  {
    label,
    hint,
    error,
    required,
    left,
    right,
    containerClassName,
    inputClassName,
    multiline,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label ? (
        <Text className="font-body-semi text-[13px] text-ink dark:text-nzila-sand">
          {label}
          {required ? <Text className="text-nzila-red"> *</Text> : null}
        </Text>
      ) : null}
      <View
        className={cn(
          "flex-row items-center gap-2 rounded-2xl border bg-surface px-4 dark:bg-coal",
          error
            ? "border-nzila-red"
            : focused
              ? "border-nzila-red"
              : "border-line dark:border-night-line",
          multiline ? "min-h-[110px] items-start py-3" : "h-12",
        )}
      >
        {left}
        <TextInput
          ref={ref}
          className={cn(
            "flex-1 font-body text-base text-ink outline-none dark:text-nzila-sand",
            multiline && "min-h-[86px]",
            inputClassName,
          )}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {right}
      </View>
      {error ? (
        <Text className="font-body text-xs text-nzila-red">{error}</Text>
      ) : hint ? (
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">{hint}</Text>
      ) : null}
    </View>
  );
});

export function PhoneInput({
  value,
  onChangeText,
  ...props
}: Omit<InputProps, "value" | "onChangeText" | "keyboardType"> & {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <Input
      value={value}
      onChangeText={(text) => {
        const cleaned = text.replace(/[^\d+]/g, "");
        const normalized = cleaned.startsWith("+")
          ? `+${cleaned.slice(1).replace(/\+/g, "")}`
          : cleaned.replace(/\+/g, "");
        onChangeText(normalized);
      }}
      keyboardType="phone-pad"
      autoComplete="tel"
      placeholder="+244923000000"
      {...props}
    />
  );
}
