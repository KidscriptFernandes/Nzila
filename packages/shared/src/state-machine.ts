import type { RideStatus, Role } from "./enums";

export type RideTransition = { to: RideStatus; roles: Role[] };

/** Máquina de estados única da corrida (RN01–RN08). */
export const rideTransitions: Record<RideStatus, RideTransition[]> = {
  NOVO: [
    { to: "EM_ANALISE", roles: ["assistant", "admin"] },
    { to: "CANCELADO", roles: ["client", "assistant", "admin"] },
  ],
  EM_ANALISE: [
    { to: "MOTORISTA_PROCURADO", roles: ["assistant", "admin"] },
    { to: "CANCELADO", roles: ["client", "assistant", "admin"] },
    { to: "PROBLEMA", roles: ["assistant", "admin"] },
  ],
  MOTORISTA_PROCURADO: [
    { to: "MOTORISTA_CONFIRMADO", roles: ["driver", "assistant", "admin"] },
    { to: "SEM_MOTORISTA", roles: ["assistant", "admin"] },
    { to: "CANCELADO", roles: ["client", "assistant", "admin"] },
  ],
  MOTORISTA_CONFIRMADO: [
    { to: "CLIENTE_CONFIRMADO", roles: ["client"] },
    { to: "MOTORISTA_PROCURADO", roles: ["driver", "assistant", "admin"] },
    { to: "CANCELADO", roles: ["client", "assistant", "admin"] },
  ],
  CLIENTE_CONFIRMADO: [
    { to: "EM_VIAGEM", roles: ["driver", "assistant", "admin"] },
    { to: "CANCELADO", roles: ["client", "assistant", "admin"] },
    { to: "PROBLEMA", roles: ["driver", "assistant", "admin", "client"] },
  ],
  EM_VIAGEM: [
    { to: "CONCLUIDO", roles: ["driver", "assistant", "admin"] },
    { to: "PROBLEMA", roles: ["driver", "assistant", "admin", "client"] },
  ],
  PROBLEMA: [
    { to: "CONCLUIDO", roles: ["assistant", "admin"] },
    { to: "CANCELADO", roles: ["assistant", "admin"] },
  ],
  SEM_MOTORISTA: [
    { to: "MOTORISTA_PROCURADO", roles: ["assistant", "admin"] },
    { to: "CANCELADO", roles: ["client", "assistant", "admin"] },
  ],
  CONCLUIDO: [],
  CANCELADO: [],
};

export const RIDE_FLOW: RideStatus[] = [
  "NOVO",
  "EM_ANALISE",
  "MOTORISTA_PROCURADO",
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
  "CONCLUIDO",
];

export const TERMINAL_RIDE_STATUSES: RideStatus[] = ["CONCLUIDO", "CANCELADO"];

export function canTransition(from: RideStatus, to: RideStatus, role: Role): boolean {
  return rideTransitions[from].some((t) => t.to === to && t.roles.includes(role));
}

export function allowedTransitions(from: RideStatus, role: Role): RideStatus[] {
  return rideTransitions[from].filter((t) => t.roles.includes(role)).map((t) => t.to);
}

export function isTerminalStatus(status: RideStatus): boolean {
  return TERMINAL_RIDE_STATUSES.includes(status);
}

export function isActiveStatus(status: RideStatus): boolean {
  return !isTerminalStatus(status) && status !== "PROBLEMA";
}
