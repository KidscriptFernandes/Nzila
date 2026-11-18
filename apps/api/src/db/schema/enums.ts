import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["client", "driver", "assistant", "admin"]);

export const rideStatusEnum = pgEnum("ride_status", [
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
]);

export const priorityEnum = pgEnum("priority", ["NORMAL", "PRIORIDADE", "URGENTE"]);

export const driverVerificationEnum = pgEnum("driver_verification", [
  "PENDENTE",
  "EM_VERIFICACAO",
  "VERIFICADO",
  "REPROVADO",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDENTE",
  "PAGO",
  "REEMBOLSADO",
  "FALHOU",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "DINHEIRO",
  "TRANSFERENCIA",
  "MULTICAIXA_EXPRESS",
  "CARTAO",
  "OUTRO",
]);

export const docTypeEnum = pgEnum("doc_type", [
  "IDENTIFICACAO",
  "CARTA_CONDUCAO",
  "LIVRETE_VIATURA",
  "SEGURO",
  "FOTO_MOTORISTA",
  "FOTO_VIATURA",
  "OUTRO",
]);

export const placeCategoryEnum = pgEnum("place_category", [
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
]);

export const supportStatusEnum = pgEnum("support_status", ["ABERTO", "EM_ATENDIMENTO", "RESOLVIDO"]);
