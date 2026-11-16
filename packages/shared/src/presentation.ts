import type {
  DriverVerificationStatus,
  PlaceCategory,
  RidePriority,
  RideStatus,
  SupportStatus,
} from "./enums";

export type StatusMeta = {
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
  description: string;
};

export const STATUS_META: Record<RideStatus, StatusMeta> = {
  NOVO: {
    label: "Pedido recebido",
    shortLabel: "Novo",
    color: "#0E6F7C",
    icon: "inbox",
    description: "Recebemos o pedido. Um assistente vai analisá-lo.",
  },
  EM_ANALISE: {
    label: "Em análise",
    shortLabel: "Em análise",
    color: "#E0A800",
    icon: "clipboard-list",
    description: "A equipa está a validar os detalhes do pedido.",
  },
  MOTORISTA_PROCURADO: {
    label: "Motorista procurado",
    shortLabel: "Procurado",
    color: "#B8860B",
    icon: "search",
    description: "Estamos a contactar motoristas parceiros.",
  },
  MOTORISTA_CONFIRMADO: {
    label: "Motorista confirmado",
    shortLabel: "Confirmado",
    color: "#4C9A6A",
    icon: "car",
    description: "Motorista encontrado. Confirma a corrida no app.",
  },
  CLIENTE_CONFIRMADO: {
    label: "Cliente confirmado",
    shortLabel: "Confirmado",
    color: "#2E7D4F",
    icon: "check-circle",
    description: "Corrida confirmada. O motorista vai à tua localização.",
  },
  EM_VIAGEM: {
    label: "Em viagem",
    shortLabel: "Em viagem",
    color: "#CC092F",
    icon: "navigation",
    description: "Estás em viagem. Bom percurso!",
  },
  CONCLUIDO: {
    label: "Concluído",
    shortLabel: "Concluído",
    color: "#0D0D0D",
    icon: "flag",
    description: "Chegaste ao destino. Conta-nos como foi.",
  },
  CANCELADO: {
    label: "Cancelado",
    shortLabel: "Cancelado",
    color: "#8A8A8A",
    icon: "x-circle",
    description: "Esta corrida foi cancelada.",
  },
  SEM_MOTORISTA: {
    label: "Sem motorista",
    shortLabel: "Sem motorista",
    color: "#9C3A24",
    icon: "alert-triangle",
    description: "Ainda não encontrámos motorista. A equipa continua a tentar.",
  },
  PROBLEMA: {
    label: "Problema",
    shortLabel: "Problema",
    color: "#E5002B",
    icon: "alert-octagon",
    description: "A equipa Nzila está a acompanhar esta situação.",
  },
};

export const PRIORITY_META: Record<
  RidePriority,
  { label: string; color: string; description: string }
> = {
  NORMAL: { label: "Normal", color: "#0E6F7C", description: "Pedido normal." },
  PRIORIDADE: {
    label: "Prioridade",
    color: "#E0A800",
    description: "Precisa de resposta mais rápida.",
  },
  URGENTE: {
    label: "Urgente",
    color: "#E5002B",
    description: "Situação que exige atenção imediata.",
  },
};

export const VERIFICATION_META: Record<
  DriverVerificationStatus,
  { label: string; color: string }
> = {
  PENDENTE: { label: "Pendente", color: "#8A8A8A" },
  EM_VERIFICACAO: { label: "Em verificação", color: "#E0A800" },
  VERIFICADO: { label: "Verificado", color: "#2E7D4F" },
  REPROVADO: { label: "Reprovado", color: "#E5002B" },
};

export const PLACE_CATEGORY_META: Record<
  PlaceCategory,
  { label: string; color: string; icon: string }
> = {
  HOTEL: { label: "Hóteis", color: "#0E6F7C", icon: "bed-double" },
  RESTAURANTE: { label: "Restaurantes", color: "#B8860B", icon: "utensils" },
  HOSPITAL: { label: "Hospitais", color: "#CC092F", icon: "hospital" },
  FARMACIA: { label: "Farmácias", color: "#CC092F", icon: "pill" },
  BANCO: { label: "Bancos", color: "#0E6F7C", icon: "landmark" },
  ATM: { label: "ATMs", color: "#0E6F7C", icon: "credit-card" },
  ATRACAO: { label: "Atrações", color: "#B8860B", icon: "camera" },
  AEROPORTO: { label: "Aeroporto", color: "#0D0D0D", icon: "plane" },
  OUTRO: { label: "Outros", color: "#4A4A4A", icon: "map-pin" },
};

export const SUPPORT_STATUS_META: Record<SupportStatus, { label: string; color: string }> = {
  ABERTO: { label: "Aberto", color: "#E0A800" },
  EM_ATENDIMENTO: { label: "Em atendimento", color: "#0E6F7C" },
  RESOLVIDO: { label: "Resolvido", color: "#2E7D4F" },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferência",
  MULTICAIXA_EXPRESS: "Multicaixa Express",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

export function formatKz(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(value)} Kz`;
}
