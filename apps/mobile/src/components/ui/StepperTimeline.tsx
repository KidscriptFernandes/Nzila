import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { RideEventDTO, RideStatus } from "@nzila/shared";
import { Check, Circle } from "lucide-react-native";
import { formatDateTime } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STEPS: RideStatus[] = [
  "NOVO",
  "EM_ANALISE",
  "MOTORISTA_PROCURADO",
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
  "CONCLUIDO",
];

const TERMINAL_FAILURE: RideStatus[] = ["CANCELADO", "SEM_MOTORISTA", "PROBLEMA"];

export function StepperTimeline({
  status,
  events = [],
  locale,
}: {
  status: RideStatus;
  events?: RideEventDTO[];
  locale?: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentIndex = STEPS.indexOf(status);
  const reached = new Set(events.map((event) => event.toStatus));
  reached.add(status);
  const failed = TERMINAL_FAILURE.includes(status);

  const timestampFor = (step: RideStatus): string | null => {
    const event = [...events].reverse().find((item) => item.toStatus === step);
    return event ? formatDateTime(event.createdAt, locale) : null;
  };

  return (
    <View>
      {STEPS.map((step, index) => {
        const isCurrent = status === step;
        const isDone =
          !failed &&
          (currentIndex > index || (currentIndex === -1 && reached.has(step)));
        const isReached = reached.has(step);
        const showLine = index < STEPS.length - 1;
        const tone = isCurrent ? colors.red : isDone || isReached ? colors.baobab : colors.line;

        return (
          <View key={step} className="flex-row gap-3">
            <View className="items-center">
              <View
                className={cn(
                  "h-6 w-6 items-center justify-center rounded-full border",
                  !isDone && !isCurrent && "bg-surface dark:bg-coal",
                )}
                style={{
                  borderColor: tone,
                  backgroundColor: isDone ? colors.baobab : undefined,
                }}
              >
                {isDone ? (
                  <Check size={13} color="#FFFFFF" strokeWidth={3} />
                ) : isCurrent ? (
                  <Circle size={8} color={tone} fill={tone} />
                ) : (
                  <Circle size={6} color={colors.line} />
                )}
              </View>
              {showLine ? (
                <View
                  className="my-1 w-0.5 flex-1"
                  style={{
                    minHeight: 26,
                    backgroundColor: isDone || isReached ? colors.baobab : colors.line,
                  }}
                />
              ) : null}
            </View>
            <View className="flex-1 pb-4">
              <Text
                className={cn(
                  "font-body-semi text-sm",
                  isCurrent
                    ? "text-nzila-red"
                    : isDone || isReached
                      ? "text-ink dark:text-nzila-sand"
                      : "text-ink-soft dark:text-night-muted",
                )}
              >
                {t(`status.${step}`)}
              </Text>
              {timestampFor(step) ? (
                <Text className="mt-0.5 font-body text-xs text-ink-soft dark:text-night-muted">
                  {timestampFor(step)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {failed ? (
        <View className="mt-1 flex-row gap-3">
          <View className="items-center">
            <View
              className="h-6 w-6 items-center justify-center rounded-full border"
              style={{ borderColor: colors.red, backgroundColor: colors.red }}
            >
              <Circle size={8} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
          <View className="flex-1">
            <Text className="font-body-semi text-sm text-nzila-red">{t(`status.${status}`)}</Text>
            {events.find((event) => event.toStatus === status)?.note ? (
              <Text className="mt-0.5 font-body text-xs text-ink-soft dark:text-night-muted">
                {events.find((event) => event.toStatus === status)?.note}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
