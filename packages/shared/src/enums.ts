export const ROLES = ["client", "driver", "assistant", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const RIDE_STATUSES = [
  "NOVO",
  "EM_ANALISE",
  "MOTORISTA_PROCURADO",
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
  "CONCLUIDO",
  "CANCELADO",
  "SEM_MOTORISTA",
  "PROBLEMA",
] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

export const RIDE_PRIORITIES = ["NORMAL", "PRIORIDADE", "URGENTE"] as const;
export type RidePriority = (typeof RIDE_PRIORITIES)[number];

export const CLIENT_RIDE_PRIORITIES = ["NORMAL", "PRIORIDADE"] as const;
export type ClientRidePriority = (typeof CLIENT_RIDE_PRIORITIES)[number];

export const DRIVER_VERIFICATION_STATUSES = [
  "PENDENTE",
  "EM_VERIFICACAO",
  "VERIFICADO",
  "REPROVADO",
] as const;
export type DriverVerificationStatus = (typeof DRIVER_VERIFICATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDENTE", "PAGO", "REEMBOLSADO", "FALHOU"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "DINHEIRO",
  "TRANSFERENCIA",
  "MULTICAIXA_EXPRESS",
  "CARTAO",
  "OUTRO",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DRIVER_DOCUMENT_TYPES = [
  "IDENTIFICACAO",
  "CARTA_CONDUCAO",
  "LIVRETE_VIATURA",
  "SEGURO",
  "FOTO_MOTORISTA",
  "FOTO_VIATURA",
  "OUTRO",
] as const;
export type DriverDocumentType = (typeof DRIVER_DOCUMENT_TYPES)[number];

export const PLACE_CATEGORIES = [
  "HOTEL",
  "RESTAURANTE",
  "HOSPITAL",
  "FARMACIA",
  "BANCO",
  "ATM",
  "PARAGEM",
  "POSTO",
  "ATRACAO",
  "AEROPORTO",
  "OUTRO",
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["ABERTO", "EM_ATENDIMENTO", "RESOLVIDO"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const LOCALES = ["pt-AO", "en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
