import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { RideStatus } from "@nzila/shared";
import { Badge } from "./Badge";

type Tone = "neutral" | "red" | "gold" | "ocean" | "green" | "clay" | "dark";

const TONES: Record<RideStatus, Tone> = {
  NOVO: "ocean",
  EM_ANALISE: "gold",
  MOTORISTA_PROCURADO: "gold",
  MOTORISTA_CONFIRMADO: "green",
  CLIENTE_CONFIRMADO: "green",
  EM_VIAGEM: "red",
  CONCLUIDO: "dark",
  CANCELADO: "neutral",
  SEM_MOTORISTA: "clay",
  PROBLEMA: "red",
};

const DOTS: Record<Tone, string> = {
  neutral: "#8A8A8A",
  red: "#CC092F",
  gold: "#B8860B",
  ocean: "#0E6F7C",
  green: "#2E7D4F",
  clay: "#9C3A24",
  dark: "#0D0D0D",
};

export function StatusBadge({ status, className }: { status: RideStatus; className?: string }) {
  const { t } = useTranslation();
  const tone = TONES[status];

  return (
    <Badge
      tone={tone}
      label={t(`status.${status}`)}
      className={className}
      icon={<View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DOTS[tone] }} />}
    />
  );
}
