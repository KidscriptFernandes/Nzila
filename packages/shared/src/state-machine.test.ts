import { describe, expect, it } from "vitest";
import { canTransition, allowedTransitions, isTerminalStatus } from "./state-machine";

describe("ride state machine", () => {
  it("permite ao assistente analisar um pedido novo", () => {
    expect(canTransition("NOVO", "EM_ANALISE", "assistant")).toBe(true);
    expect(canTransition("NOVO", "EM_ANALISE", "client")).toBe(false);
  });

  it("exige que o cliente confirme a corrida com motorista", () => {
    expect(canTransition("MOTORISTA_CONFIRMADO", "CLIENTE_CONFIRMADO", "client")).toBe(true);
    expect(canTransition("MOTORISTA_CONFIRMADO", "CLIENTE_CONFIRMADO", "driver")).toBe(false);
  });

  it("permite ao motorista desistir e voltar a procura (RN07)", () => {
    expect(canTransition("MOTORISTA_CONFIRMADO", "MOTORISTA_PROCURADO", "driver")).toBe(true);
  });

  it("bloqueia transicoes depois de concluida", () => {
    expect(allowedTransitions("CONCLUIDO", "admin")).toEqual([]);
    expect(isTerminalStatus("CONCLUIDO")).toBe(true);
  });
});
