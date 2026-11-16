import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock3 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

function displayValue(date: Date, mode: "date" | "time"): string {
  if (mode === "date") {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function DatePickerField({
  label,
  value,
  onChange,
  mode,
  minimumDate,
  hint,
  error,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode: "date" | "time";
  minimumDate?: Date;
  hint?: string;
  error?: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const Icon = mode === "date" ? CalendarDays : Clock3;

  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS !== "ios") setOpen(false);
    if (event.type === "set" && next) onChange(next);
  };

  return (
    <View className="flex-1 gap-1.5">
      <Text className="font-body-semi text-[13px] text-ink dark:text-nzila-sand">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        className={cn(
          "h-12 flex-row items-center gap-2 rounded-2xl border bg-surface px-4 dark:bg-coal",
          error ? "border-nzila-red" : "border-line dark:border-night-line",
        )}
      >
        <Icon size={18} color={colors.muted} />
        <Text className="flex-1 font-body text-base text-ink dark:text-nzila-sand">
          {displayValue(value, mode)}
        </Text>
      </Pressable>
      {error ? (
        <Text className="font-body text-xs text-nzila-red">{error}</Text>
      ) : hint ? (
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">{hint}</Text>
      ) : null}

      {open ? (
        <View className="mt-1 rounded-2xl border border-line bg-surface p-2 dark:border-night-line dark:bg-coal">
          <DateTimePicker
            value={value}
            mode={mode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={minimumDate}
            onChange={handleChange}
            themeVariant={colors.dark ? "dark" : "light"}
          />
          {Platform.OS === "ios" ? (
            <Pressable
              onPress={() => setOpen(false)}
              className="mt-2 h-10 items-center justify-center rounded-xl bg-nzila-red"
            >
              <Text className="font-body-semi text-sm text-white">{t("common.confirm")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
