export const BRAND = {
  red: "#CC092F",
  black: "#0D0D0D",
  gold: "#FFCB00",
  sun: "#FFE066",
  sand: "#F7F0E3",
  clay: "#9C3A24",
  ocean: "#0E6F7C",
  baobab: "#2E7D4F",
  inkSoft: "#4A4A4A",
  line: "#E6DCC8",
} as const;

export const MIN_RIDE_LEAD_MINUTES = 30;
export const MAX_RIDE_PASSENGERS = 8;
export const MAX_RIDE_LUGGAGE = 10;

/** RN03 — nunca prometer segurança absoluta. */
export const TRUST_BANNER =
  "Trabalhamos com parceiros verificados e acompanhamos o serviço. Não prometemos segurança absoluta.";
export const MAP_SAFETY_DISCLAIMER = "O mapa é orientação, não garantia de segurança.";
export const EMERGENCY_DISCLAIMER =
  "Em emergência, contacta os serviços oficiais de emergência locais.";
export const SUPPORT_HOURS_LABEL = "Atendimento humano: todos os dias, 08:00–22:00 (Luanda).";

export const EMERGENCY_NUMBERS = [
  { label: "Polícia Nacional", number: "113" },
  { label: "Bombeiros", number: "115" },
  { label: "INEMA / Protecção Civil", number: "112" },
] as const;

export const DEFAULT_CANCELLATION_POLICY =
  "Cancelamento gratuito até 2 horas antes da recolha. Depois desse prazo pode aplicar-se uma taxa de 30% do valor acordado. Em caso de emergência, fala com um assistente Nzila.";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Olá Nzila! Preciso de ajuda com uma corrida em Luanda.";

export const APP_TIMEZONE = "Africa/Luanda";
export const RIDE_REFERENCE_PREFIX = "NZ";
