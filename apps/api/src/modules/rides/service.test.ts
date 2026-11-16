import { describe, expect, it } from "vitest";
import type { RideStatus } from "@nzila/shared";
import { AppError } from "../../lib/errors";
import {
  assertRideCanBeConfirmed,
  missingRideConfirmationFields,
} from "./service";

type ConfirmationRide = Parameters<typeof missingRideConfirmationFields>[0];

function ride(overrides: Partial<ConfirmationRide> = {}): ConfirmationRide {
  return {
    driverId: "00000000-0000-0000-0000-000000000001",
    vehicleId: "00000000-0000-0000-0000-000000000002",
    scheduledAt: new Date(Date.now() + 3_600_000),
    priceKz: 15_000,
    priceConfirmedAt: new Date(),
    origin: "Aeroporto",
    destination: "Hotel",
    customerPhone: "+244923000000",
    ...overrides,
  };
}

describe("guardas de confirmação da corrida", () => {
  it("não encontra campos em falta numa corrida completa", () => {
    expect(missingRideConfirmationFields(ride())).toEqual([]);
  });

  it("bloqueia confirmação sem preço confirmado (RN01)", () => {
    expect(missingRideConfirmationFields(ride({ priceKz: null }))).toContain("preço");
  });

  it("lança RN01 ao confirmar sem motorista", () => {
    const fullRide = {
      ...ride({ driverId: null }),
      cancellationPolicyCommunicatedAt: new Date(),
      status: "MOTORISTA_PROCURADO" as RideStatus,
    };

    expect(() =>
      assertRideCanBeConfirmed(fullRide as never, "MOTORISTA_CONFIRMADO"),
    ).toThrowError(AppError);

    try {
      assertRideCanBeConfirmed(fullRide as never, "MOTORISTA_CONFIRMADO");
    } catch (error) {
      expect((error as AppError).code).toBe("RN01");
      expect((error as AppError).status).toBe(422);
    }
  });

  it("lança RN06 quando a política não foi comunicada", () => {
    const fullRide = {
      ...ride(),
      cancellationPolicyCommunicatedAt: null,
      status: "MOTORISTA_CONFIRMADO" as RideStatus,
    };

    try {
      assertRideCanBeConfirmed(fullRide as never, "CLIENTE_CONFIRMADO");
      throw new Error("devia ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("RN06");
    }
  });
});
