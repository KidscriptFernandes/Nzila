import { and, count, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  canTransition,
  isTerminalStatus,
  type CreateRidePayload,
  type Paginated,
  type RideDTO,
  type RideStatus,
  type Role,
} from "@nzila/shared";
import type { DB } from "../../db/client";
import type { AuthUser } from "../../plugins/auth";
import { Errors } from "../../lib/errors";
import {
  clients,
  drivers,
  profiles,
  rideEvents,
  rides,
  ratings,
  vehicles,
} from "../../db/schema";
import { presentRide, type DriverJoin } from "./presenter";

type RideRow = typeof rides.$inferSelect;

export function missingRideConfirmationFields(
  ride: Pick<
    RideRow,
    | "driverId"
    | "vehicleId"
    | "scheduledAt"
    | "priceKz"
    | "priceConfirmedAt"
    | "origin"
    | "destination"
    | "customerPhone"
  >,
): string[] {
  const missing: string[] = [];
  if (!ride.driverId) missing.push("motorista");
  if (!ride.vehicleId) missing.push("viatura");
  if (!ride.scheduledAt) missing.push("horário");
  if (!ride.priceKz || !ride.priceConfirmedAt) missing.push("preço");
  if (!ride.origin || !ride.destination || !ride.customerPhone) missing.push("dados essenciais");
  return missing;
}

export function assertRideCanBeConfirmed(ride: RideRow, to: RideStatus): void {
  if (to !== "MOTORISTA_CONFIRMADO" && to !== "CLIENTE_CONFIRMADO") return;
  const missing = missingRideConfirmationFields(ride);
  if (missing.length) {
    throw Errors.businessRule("RN01", `Faltam dados: ${missing.join(", ")}`);
  }
  if (to === "CLIENTE_CONFIRMADO" && !ride.cancellationPolicyCommunicatedAt) {
    throw Errors.businessRule("RN06", "A política de cancelamento ainda não foi comunicada");
  }
}

export async function fetchRideRow(db: DB, rideId: string): Promise<RideRow> {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
  if (!ride) throw Errors.notFound("Corrida");
  return ride;
}

export function assertRideAccess(ride: RideRow, actor: AuthUser): void {
  if (actor.role === "assistant" || actor.role === "admin") return;
  if (actor.role === "client" && ride.clientId === actor.id) return;
  if (actor.role === "driver" && ride.driverId === actor.id) return;
  throw Errors.forbidden();
}

export async function createRide(
  db: DB,
  clientId: string,
  payload: CreateRidePayload,
): Promise<RideRow> {
  return db.transaction(async (tx) => {
    await tx.insert(clients).values({ id: clientId }).onConflictDoNothing();

    const rows = await tx.execute<{ ref: string }>(sql`
      select 'NZ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ride_ref_seq')::text, 6, '0') as ref
    `);
    const reference = rows[0]?.ref;
    if (!reference) throw new Error("Falha ao gerar referência da corrida");

    const [ride] = await tx
      .insert(rides)
      .values({
        reference,
        clientId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        origin: payload.origin,
        originLat: payload.originLat?.toString() ?? null,
        originLng: payload.originLng?.toString() ?? null,
        destination: payload.destination,
        destinationLat: payload.destinationLat?.toString() ?? null,
        destinationLng: payload.destinationLng?.toString() ?? null,
        scheduledAt: payload.scheduledAt,
        passengers: payload.passengers,
        luggage: payload.luggage,
        notes: payload.notes ?? null,
        priority: payload.priority,
        status: "NOVO",
      })
      .returning();

    if (!ride) throw new Error("Falha ao criar corrida");

    await tx.insert(rideEvents).values({
      rideId: ride.id,
      toStatus: "NOVO",
      actorId: clientId,
      actorRole: "client",
    });

    return ride;
  });
}

export interface TransitionOptions {
  note?: string;
  meta?: Record<string, unknown>;
}

export async function transitionRide(
  db: DB,
  rideId: string,
  to: RideStatus,
  actor: AuthUser,
  options: TransitionOptions = {},
): Promise<RideRow> {
  return db.transaction(async (tx) => {
    const [ride] = await tx
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .for("update");

    if (!ride) throw Errors.notFound("Corrida");
    assertRideAccess(ride, actor);

    const from = ride.status as RideStatus;
    if (!canTransition(from, to, actor.role)) {
      throw Errors.invalidTransition(from, to);
    }

    assertRideCanBeConfirmed(ride, to);

    if (to === "MOTORISTA_CONFIRMADO") {
      const [driver] = await tx
        .select({ verification: drivers.verification })
        .from(drivers)
        .where(eq(drivers.id, ride.driverId!));
      if (!driver || driver.verification !== "VERIFICADO") {
        throw Errors.businessRule("DRIVER_NOT_VERIFIED", "Motorista não verificado");
      }
    }

    if (isTerminalStatus(from)) {
      throw Errors.invalidTransition(from, to);
    }

    const patch: Partial<typeof rides.$inferInsert> = { status: to };

    if (from === "MOTORISTA_CONFIRMADO" && to === "MOTORISTA_PROCURADO") {
      patch.driverId = null;
      patch.vehicleId = null;
    }
    if (to === "CANCELADO") patch.cancelReason = options.note ?? null;
    if (to === "CONCLUIDO") patch.completedAt = new Date();

    const [updated] = await tx
      .update(rides)
      .set(patch)
      .where(eq(rides.id, rideId))
      .returning();

    if (!updated) throw Errors.notFound("Corrida");

    await tx.insert(rideEvents).values({
      rideId,
      fromStatus: from,
      toStatus: to,
      actorId: actor.id,
      actorRole: actor.role,
      note: options.note ?? null,
      meta: options.meta ?? null,
    });

    return updated;
  });
}

export async function listRidesForActor(
  db: DB,
  actor: AuthUser,
  query: { status?: RideStatus; limit: number; offset: number },
): Promise<Paginated<RideDTO>> {
  if (actor.role !== "client" && actor.role !== "driver") {
    throw Errors.forbidden("Usa o painel operacional");
  }

  const scope =
    actor.role === "client" ? eq(rides.clientId, actor.id) : eq(rides.driverId, actor.id);
  const where = query.status ? and(scope, eq(rides.status, query.status)) : scope;

  const driverProfile = alias(profiles, "driver_profile");

  const [totalRow] = await db.select({ value: count() }).from(rides).where(where);

  const rows = await db
    .select({
      ride: rides,
      driverCode: drivers.code,
      driverRatingAvg: drivers.ratingAvg,
      driverRatingCount: drivers.ratingCount,
      driverVerification: drivers.verification,
      driverName: driverProfile.fullName,
      driverWhatsapp: driverProfile.whatsapp,
      vehicle: vehicles,
    })
    .from(rides)
    .leftJoin(drivers, eq(rides.driverId, drivers.id))
    .leftJoin(driverProfile, eq(drivers.id, driverProfile.id))
    .leftJoin(vehicles, eq(rides.vehicleId, vehicles.id))
    .where(where)
    .orderBy(desc(rides.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  const items = rows.map((row) =>
    presentRide(row.ride, {
      actorRole: actor.role as Role,
      actorId: actor.id,
      driver: toDriverJoin(row),
      vehicle: row.vehicle,
    }),
  );

  return {
    items,
    total: Number(totalRow?.value ?? 0),
    limit: query.limit,
    offset: query.offset,
  };
}

function toDriverJoin(row: {
  driverCode: string | null;
  driverRatingAvg: string | null;
  driverRatingCount: number | null;
  driverVerification: DriverJoin["verification"] | null;
  driverName: string | null;
  driverWhatsapp: string | null;
}): DriverJoin | null {
  if (
    !row.driverCode ||
    !row.driverVerification ||
    row.driverRatingAvg == null ||
    row.driverRatingCount == null ||
    !row.driverName
  ) {
    return null;
  }
  return {
    code: row.driverCode,
    ratingAvg: row.driverRatingAvg,
    ratingCount: row.driverRatingCount,
    verification: row.driverVerification,
    fullName: row.driverName,
    whatsapp: row.driverWhatsapp ?? "",
  };
}

export async function getRideDetail(
  db: DB,
  rideId: string,
  actor: AuthUser,
): Promise<RideDTO> {
  const driverProfile = alias(profiles, "driver_profile");

  const [row] = await db
    .select({
      ride: rides,
      driverCode: drivers.code,
      driverRatingAvg: drivers.ratingAvg,
      driverRatingCount: drivers.ratingCount,
      driverVerification: drivers.verification,
      driverName: driverProfile.fullName,
      driverWhatsapp: driverProfile.whatsapp,
      vehicle: vehicles,
    })
    .from(rides)
    .leftJoin(drivers, eq(rides.driverId, drivers.id))
    .leftJoin(driverProfile, eq(drivers.id, driverProfile.id))
    .leftJoin(vehicles, eq(rides.vehicleId, vehicles.id))
    .where(eq(rides.id, rideId));

  if (!row) throw Errors.notFound("Corrida");
  assertRideAccess(row.ride, actor);

  const events = await db
    .select()
    .from(rideEvents)
    .where(eq(rideEvents.rideId, rideId))
    .orderBy(rideEvents.createdAt)
    .limit(50);

  const [rating] = await db.select().from(ratings).where(eq(ratings.rideId, rideId));

  return presentRide(row.ride, {
    actorRole: actor.role as Role,
    actorId: actor.id,
    driver: toDriverJoin(row),
    vehicle: row.vehicle,
    events,
    rating: rating ?? null,
  });
}
