import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  error?: string;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        className="flex-row items-start gap-3"
      >
        <View
          className={cn(
            "mt-0.5 h-5 w-5 items-center justify-center rounded-md border",
            checked
              ? "border-nzila-red bg-nzila-red"
              : "border-line bg-surface dark:border-night-line dark:bg-coal",
          )}
        >
          {checked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <Text className="flex-1 font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
          {label}
        </Text>
      </Pressable>
      {error ? <Text className="mt-1 font-body text-xs text-nzila-red">{error}</Text> : null}
    </View>
  );
}
