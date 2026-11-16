import { randomBytes } from "node:crypto";
import { and, asc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  DEFAULT_CANCELLATION_POLICY,
  type AdminDriverDTO,
  type AdminMetricsDTO,
  type AdminRideQueueDTO,
  type AssignDriverInput,
  type CreateDriverInput,
  type DriverVerificationStatus,
  type PaymentMethod,
  type PaymentStatus,
  type RidePriority,
  type RideStatus,
  type SupportRequestDTO,
  type SupportStatus,
  type VehicleDTO,
} from "@nzila/shared";
import type { DB } from "../../db/client";
import type { AuthUser } from "../../plugins/auth";
import {
  auditLogs,
  clients,
  drivers,
  profiles,
  rideEvents,
  rides,
  supportRequests,
  vehicles,
} from "../../db/schema";
import { AppError, Errors } from "../../lib/errors";
import { supabaseAdmin } from "../../lib/supabase-admin";
import { presentRide, type DriverJoin } from "../rides/presenter";
import { fetchRideRow } from "../rides/service";

type RideRow = typeof rides.$inferSelect;

const ACTIVE_ASSIGNMENT_STATUSES = [
  "MOTORISTA_PROCURADO",
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
] as const;

function toDriverJoin(row: {
  driverCode: string | null;
  driverRatingAvg: string | null;
  driverRatingCount: number | null;
  driverVerification: DriverVerificationStatus | null;
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

function toVehicleDto(vehicle: typeof vehicles.$inferSelect): VehicleDTO {
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    color: vehicle.color,
    plate: vehicle.plate,
    seats: vehicle.seats,
    active: vehicle.active,
  };
}

export async function listAdminRides(
  db: DB,
  actor: AuthUser,
  query: { status?: RideStatus; priority?: RidePriority; limit: number },
): Promise<AdminRideQueueDTO> {
  const driverProfile = alias(profiles, "driver_profile");
  const filters: SQL[] = [];
  if (query.status) filters.push(eq(rides.status, query.status));
  if (query.priority) filters.push(eq(rides.priority, query.priority));

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
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(
      sql`case ${rides.priority} when 'URGENTE' then 0 when 'PRIORIDADE' then 1 else 2 end`,
      asc(rides.scheduledAt),
    )
    .limit(query.limit);

  const countRows = await db.execute<{ status: string; total: number }>(sql`
    select status::text as status, count(*)::int as total from rides group by status
  `);
  const counts: Record<string, number> = {};
  for (const row of countRows) counts[row.status] = Number(row.total);

  const [todayRow] = await db.execute<{ total: number }>(sql`
    select count(*)::int as total
    from rides
    where (created_at at time zone 'Africa/Luanda')::date
      = (now() at time zone 'Africa/Luanda')::date
  `);

  return {
    items: rows.map((row) =>
      presentRide(row.ride, {
        actorRole: actor.role,
        actorId: actor.id,
        driver: toDriverJoin(row),
        vehicle: row.vehicle,
      }),
    ),
    counts,
    today: Number(todayRow?.total ?? 0),
  };
}

export async function assignDriverToRide(
  db: DB,
  rideId: string,
  input: AssignDriverInput,
  actor: AuthUser,
  ip?: string,
): Promise<RideRow> {
  return db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(eq(rides.id, rideId)).for("update");
    if (!ride) throw Errors.notFound("Corrida");

    if (!["EM_ANALISE", "SEM_MOTORISTA", "MOTORISTA_PROCURADO"].includes(ride.status)) {
      throw Errors.conflict(
        "ASSIGN_BLOCKED",
        "Só é possível atribuir motorista em análise, sem motorista ou à procura.",
      );
    }

    const [driver] = await tx
      .select({ id: drivers.id, verification: drivers.verification })
      .from(drivers)
      .where(eq(drivers.id, input.driverId));

    if (!driver) throw Errors.notFound("Motorista");
    if (driver.verification !== "VERIFICADO") {
      throw Errors.businessRule("DRIVER_NOT_VERIFIED", "Motorista não verificado");
    }

    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, input.vehicleId),
          eq(vehicles.driverId, input.driverId),
          eq(vehicles.active, true),
        ),
      );

    if (!vehicle) {
      throw Errors.businessRule("VEHICLE_INVALID", "Viatura inválida para este motorista");
    }
    if (vehicle.seats < ride.passengers) {
      throw Errors.businessRule("VEHICLE_SEATS", "Viatura sem lugares suficientes");
    }

    const [conflict] = await tx
      .select({ id: rides.id })
      .from(rides)
      .where(
        and(
          eq(rides.driverId, input.driverId),
          ne(rides.id, rideId),
          inArray(rides.status, ACTIVE_ASSIGNMENT_STATUSES),
          sql`abs(extract(epoch from (${rides.scheduledAt} - ${ride.scheduledAt}))) < 7200`,
        ),
      )
      .limit(1);

    if (conflict) {
      throw Errors.conflict(
        "DRIVER_BUSY",
        "Motorista já tem uma corrida neste intervalo (±2 horas)",
      );
    }

    const [updated] = await tx
      .update(rides)
      .set({
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        assignedBy: actor.id,
        status: "MOTORISTA_PROCURADO",
      })
      .where(eq(rides.id, rideId))
      .returning();

    if (!updated) throw Errors.notFound("Corrida");

    await tx.insert(rideEvents).values({
      rideId,
      fromStatus: ride.status,
      toStatus: "MOTORISTA_PROCURADO",
      actorId: actor.id,
      actorRole: actor.role,
      note: "Motorista atribuído manualmente",
      meta: { driverId: input.driverId, vehicleId: input.vehicleId },
    });

    await tx.insert(auditLogs).values({
      actorId: actor.id,
      action: "ride.assign",
      entity: "rides",
      entityId: rideId,
      meta: { driverId: input.driverId, vehicleId: input.vehicleId },
      ip: ip ?? null,
    });

    return updated;
  });
}

export async function setRidePrice(
  db: DB,
  rideId: string,
  input: { priceKz: number; cancellationPolicy?: string },
  actor: AuthUser,
  ip?: string,
): Promise<RideRow> {
  const ride = await fetchRideRow(db, rideId);

  if (["EM_VIAGEM", "CONCLUIDO", "CANCELADO", "PROBLEMA", "CLIENTE_CONFIRMADO"].includes(ride.status)) {
    throw Errors.conflict(
      "PRICE_LOCKED",
      "O preço já não pode ser alterado neste estado. Cancela e cria um novo pedido se necessário.",
    );
  }

  const [updated] = await db
    .update(rides)
    .set({
      priceKz: input.priceKz,
      priceConfirmedAt: new Date(),
      cancellationPolicy: ride.cancellationPolicy ?? input.cancellationPolicy ?? DEFAULT_CANCELLATION_POLICY,
    })
    .where(eq(rides.id, rideId))
    .returning();

  if (!updated) throw Errors.notFound("Corrida");

  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "ride.price",
    entity: "rides",
    entityId: rideId,
    meta: { priceKz: input.priceKz },
    ip: ip ?? null,
  });

  return updated;
}

export async function recordCancellationPolicy(
  db: DB,
  rideId: string,
  cancellationPolicy: string,
  actor: AuthUser,
  ip?: string,
): Promise<RideRow> {
  const ride = await fetchRideRow(db, rideId);
  if (["EM_VIAGEM", "CONCLUIDO", "CANCELADO"].includes(ride.status)) {
    throw Errors.conflict("POLICY_LOCKED", "A política já não pode ser alterada neste estado.");
  }

  const [updated] = await db
    .update(rides)
    .set({ cancellationPolicy, cancellationPolicyCommunicatedAt: new Date() })
    .where(eq(rides.id, rideId))
    .returning();

  if (!updated) throw Errors.notFound("Corrida");

  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "ride.policy",
    entity: "rides",
    entityId: rideId,
    meta: { cancellationPolicy },
    ip: ip ?? null,
  });

  return updated;
}

export async function recordPayment(
  db: DB,
  rideId: string,
  input: { paymentStatus: PaymentStatus; paymentMethod?: PaymentMethod },
  actor: AuthUser,
  ip?: string,
): Promise<RideRow> {
  const ride = await fetchRideRow(db, rideId);

  const method = input.paymentMethod ?? ride.paymentMethod ?? undefined;
  if (input.paymentStatus === "PAGO" && !method) {
    throw Errors.businessRule("PAYMENT_METHOD_REQUIRED", "Indica o método de pagamento");
  }

  const [updated] = await db
    .update(rides)
    .set({
      paymentStatus: input.paymentStatus,
      paymentMethod: method ?? null,
    })
    .where(eq(rides.id, rideId))
    .returning();

  if (!updated) throw Errors.notFound("Corrida");

  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "ride.payment",
    entity: "rides",
    entityId: rideId,
    meta: { paymentStatus: input.paymentStatus, paymentMethod: method ?? null },
    ip: ip ?? null,
  });

  return updated;
}

export async function updateRideRoute(
  db: DB,
  rideId: string,
  input: {
    origin?: string;
    originLat?: number | null;
    originLng?: number | null;
    destination?: string;
    destinationLat?: number | null;
    destinationLng?: number | null;
  },
  actor: AuthUser,
  ip?: string,
): Promise<RideRow> {
  const ride = await fetchRideRow(db, rideId);

  if (["EM_VIAGEM", "CONCLUIDO", "CANCELADO", "PROBLEMA"].includes(ride.status)) {
    throw Errors.conflict("ROUTE_LOCKED", "O percurso já não pode ser alterado neste estado.");
  }

  const originChanged = input.origin !== undefined && input.origin !== ride.origin;
  const destinationChanged =
    input.destination !== undefined && input.destination !== ride.destination;

  if (!originChanged && !destinationChanged) return ride;

  const patch: Partial<typeof rides.$inferInsert> = {
    status: "EM_ANALISE",
    priceConfirmedAt: null,
    cancellationPolicyCommunicatedAt: null,
  };

  if (originChanged && input.origin !== undefined) {
    patch.origin = input.origin;
    patch.originLat =
      input.originLat === undefined ? null : input.originLat === null ? null : String(input.originLat);
    patch.originLng =
      input.originLng === undefined ? null : input.originLng === null ? null : String(input.originLng);
  }

  if (destinationChanged && input.destination !== undefined) {
    patch.destination = input.destination;
    patch.destinationLat =
      input.destinationLat === undefined
        ? null
        : input.destinationLat === null
          ? null
          : String(input.destinationLat);
    patch.destinationLng =
      input.destinationLng === undefined
        ? null
        : input.destinationLng === null
          ? null
          : String(input.destinationLng);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(rides).set(patch).where(eq(rides.id, rideId)).returning();
    if (!updated) throw Errors.notFound("Corrida");

    await tx.insert(rideEvents).values({
      rideId,
      fromStatus: ride.status,
      toStatus: "EM_ANALISE",
      actorId: actor.id,
      actorRole: actor.role,
      note: "Percurso alterado — novo acordo de preço necessário (RN05)",
      meta: {
        origin: updated.origin,
        destination: updated.destination,
      },
    });

    await tx.insert(auditLogs).values({
      actorId: actor.id,
      action: "ride.route_change",
      entity: "rides",
      entityId: rideId,
      meta: { origin: updated.origin, destination: updated.destination },
      ip: ip ?? null,
    });

    return updated;
  });
}

export async function listAdminDrivers(
  db: DB,
  query: { verification?: DriverVerificationStatus; q?: string; limit: number },
): Promise<{ items: AdminDriverDTO[] }> {
  const filters: SQL[] = [];
  if (query.verification) filters.push(eq(drivers.verification, query.verification));
  if (query.q) {
    const search = or(ilike(profiles.fullName, `%${query.q}%`), ilike(drivers.code, `%${query.q}%`));
    if (search) filters.push(search);
  }

  const rows = await db
    .select({
      driver: drivers,
      fullName: profiles.fullName,
      whatsapp: profiles.whatsapp,
    })
    .from(drivers)
    .innerJoin(profiles, eq(drivers.id, profiles.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(profiles.fullName))
    .limit(query.limit);

  const ids = rows.map((row) => row.driver.id);
  const vehicleRows = ids.length
    ? await db.select().from(vehicles).where(inArray(vehicles.driverId, ids))
    : [];
  const vehicleMap = new Map<string, VehicleDTO[]>();
  for (const vehicle of vehicleRows) {
    const list = vehicleMap.get(vehicle.driverId) ?? [];
    list.push(toVehicleDto(vehicle));
    vehicleMap.set(vehicle.driverId, list);
  }

  return {
    items: rows.map((row) => ({
      id: row.driver.id,
      fullName: row.fullName,
      whatsapp: row.whatsapp,
      code: row.driver.code,
      verification: row.driver.verification,
      verifiedAt: row.driver.verifiedAt?.toISOString() ?? null,
      zones: row.driver.zones,
      ratingAvg: row.driver.ratingAvg,
      ratingCount: row.driver.ratingCount,
      available: row.driver.available,
      vehicles: vehicleMap.get(row.driver.id) ?? [],
      createdAt: row.driver.createdAt.toISOString(),
    })),
  };
}

function pgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const direct = (error as { code?: string }).code;
  if (direct) return direct;
  return (error as { cause?: { code?: string } }).cause?.code;
}

export async function createDriver(
  db: DB,
  input: CreateDriverInput,
  actor: AuthUser,
  ip?: string,
): Promise<{ driver: AdminDriverDTO; credentials: { email: string; temporaryPassword: string } }> {
  const temporaryPassword = randomBytes(12).toString("base64url");

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      whatsapp: input.whatsapp,
      locale: "pt-AO",
    },
  });

  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already")) {
      throw Errors.conflict("EMAIL_EXISTS", "Já existe uma conta com este email");
    }
    throw new AppError(502, "AUTH_ERROR", `Não foi possível criar a conta: ${error?.message ?? "erro"}`);
  }

  const userId = data.user.id;

  try {
    const driver = await db.transaction(async (tx) => {
      await tx
        .insert(profiles)
        .values({
          id: userId,
          role: "driver",
          fullName: input.fullName,
          whatsapp: input.whatsapp,
          locale: "pt-AO",
          consentAt: new Date(),
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            role: "driver",
            fullName: input.fullName,
            whatsapp: input.whatsapp,
          },
        });

      await tx.delete(clients).where(eq(clients.id, userId));

      const codeRows = await tx.execute<{ code: string }>(sql`
        select 'NZ-M' || lpad(nextval('driver_code_seq')::text, 3, '0') as code
      `);
      const code = codeRows[0]?.code;
      if (!code) throw new Error("Falha ao gerar código do motorista");

      const [driverRow] = await tx
        .insert(drivers)
        .values({
          id: userId,
          code,
          verification: "PENDENTE",
          zones: input.zones,
          references: input.references ?? null,
        })
        .returning();

      if (!driverRow) throw new Error("Falha ao criar motorista");

      const [vehicle] = await tx
        .insert(vehicles)
        .values({
          driverId: userId,
          make: input.vehicle.make,
          model: input.vehicle.model,
          color: input.vehicle.color,
          plate: input.vehicle.plate,
          seats: input.vehicle.seats,
        })
        .returning();

      await tx.insert(auditLogs).values({
        actorId: actor.id,
        action: "driver.create",
        entity: "drivers",
        entityId: userId,
        meta: { code, vehicleId: vehicle?.id ?? null },
        ip: ip ?? null,
      });

      return {
        id: driverRow.id,
        fullName: input.fullName,
        whatsapp: input.whatsapp,
        code: driverRow.code,
        verification: driverRow.verification,
        verifiedAt: null,
        zones: driverRow.zones,
        ratingAvg: driverRow.ratingAvg,
        ratingCount: driverRow.ratingCount,
        available: driverRow.available,
        vehicles: vehicle ? [toVehicleDto(vehicle)] : [],
        createdAt: driverRow.createdAt.toISOString(),
      } satisfies AdminDriverDTO;
    });

    return { driver, credentials: { email: input.email, temporaryPassword } };
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);

    if (pgErrorCode(error) === "23505") {
      throw Errors.conflict("PLATE_EXISTS", "Já existe uma viatura com esta matrícula");
    }
    throw error;
  }
}

export async function updateDriverVerification(
  db: DB,
  driverId: string,
  input: { verification: DriverVerificationStatus; note?: string },
  actor: AuthUser,
  ip?: string,
): Promise<AdminDriverDTO> {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId));
  if (!driver) throw Errors.notFound("Motorista");

  const allowed: Record<DriverVerificationStatus, DriverVerificationStatus[]> = {
    PENDENTE: ["EM_VERIFICACAO", "REPROVADO"],
    EM_VERIFICACAO: ["VERIFICADO", "REPROVADO"],
    VERIFICADO: ["REPROVADO"],
    REPROVADO: ["EM_VERIFICACAO"],
  };

  if (!allowed[driver.verification].includes(input.verification)) {
    throw Errors.invalidTransition(driver.verification, input.verification);
  }

  const verified = input.verification === "VERIFICADO";

  await db.transaction(async (tx) => {
    await tx
      .update(drivers)
      .set({
        verification: input.verification,
        verifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? actor.id : null,
      })
      .where(eq(drivers.id, driverId));

    await tx.insert(auditLogs).values({
      actorId: actor.id,
      action: "driver.verify",
      entity: "drivers",
      entityId: driverId,
      meta: { from: driver.verification, to: input.verification, note: input.note ?? null },
      ip: ip ?? null,
    });
  });

  const result = await listAdminDrivers(db, { q: driver.code, limit: 1 });
  const updated = result.items.find((item) => item.id === driverId);
  if (!updated) throw Errors.notFound("Motorista");
  return updated;
}

export async function listAdminSupport(
  db: DB,
  query: { status?: SupportStatus; priority?: RidePriority; limit: number },
): Promise<{ items: SupportRequestDTO[] }> {
  const filters: SQL[] = [];
  if (query.status) filters.push(eq(supportRequests.status, query.status));
  if (query.priority) filters.push(eq(supportRequests.priority, query.priority));

  const rows = await db
    .select({
      support: supportRequests,
      riderName: profiles.fullName,
      riderPhone: profiles.whatsapp,
      rideReference: rides.reference,
    })
    .from(supportRequests)
    .innerJoin(profiles, eq(supportRequests.profileId, profiles.id))
    .leftJoin(rides, eq(supportRequests.rideId, rides.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(
      sql`case ${supportRequests.priority} when 'URGENTE' then 0 when 'PRIORIDADE' then 1 else 2 end`,
      asc(supportRequests.createdAt),
    )
    .limit(query.limit);

  return {
    items: rows.map((row) => ({
      id: row.support.id,
      profileId: row.support.profileId,
      rideId: row.support.rideId,
      priority: row.support.priority,
      message: row.support.message,
      status: row.support.status,
      handledBy: row.support.handledBy,
      createdAt: row.support.createdAt.toISOString(),
      resolvedAt: row.support.resolvedAt?.toISOString() ?? null,
      riderName: row.riderName,
      riderPhone: row.riderPhone,
      rideReference: row.rideReference,
    })),
  };
}

export async function updateSupportRequest(
  db: DB,
  supportId: string,
  input: { status: "EM_ATENDIMENTO" | "RESOLVIDO"; note?: string },
  actor: AuthUser,
  ip?: string,
): Promise<{ request: typeof supportRequests.$inferSelect; previousStatus: string }> {
  const [request] = await db
    .select()
    .from(supportRequests)
    .where(eq(supportRequests.id, supportId));
  if (!request) throw Errors.notFound("Pedido de ajuda");

  const [updated] = await db
    .update(supportRequests)
    .set({
      status: input.status,
      handledBy: actor.id,
      resolvedAt: input.status === "RESOLVIDO" ? new Date() : null,
      resolutionNote: input.note ?? request.resolutionNote,
    })
    .where(eq(supportRequests.id, supportId))
    .returning();

  if (!updated) throw Errors.notFound("Pedido de ajuda");

  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "support.update",
    entity: "support_requests",
    entityId: supportId,
    meta: { from: request.status, to: input.status, note: input.note ?? null },
    ip: ip ?? null,
  });

  return { request: updated, previousStatus: request.status };
}

export async function getMetrics(db: DB): Promise<AdminMetricsDTO> {
  const [totals] = await db.execute<{
    requests_total: number;
    requests_today: number;
    confirmed_total: number;
    paid_total: number;
    cancelled_total: number;
    no_driver_total: number;
  }>(sql`
    select
      count(*)::int as requests_total,
      count(*) filter (
        where (created_at at time zone 'Africa/Luanda')::date
          = (now() at time zone 'Africa/Luanda')::date
      )::int as requests_today,
      count(*) filter (
        where status in ('MOTORISTA_CONFIRMADO', 'CLIENTE_CONFIRMADO', 'EM_VIAGEM', 'CONCLUIDO')
      )::int as confirmed_total,
      count(*) filter (where payment_status = 'PAGO')::int as paid_total,
      count(*) filter (where status = 'CANCELADO')::int as cancelled_total,
      count(*) filter (where status = 'SEM_MOTORISTA')::int as no_driver_total
    from rides
  `);

  const [ratingStats] = await db.execute<{
    ratings_avg: number | null;
    recommend_rate: number | null;
  }>(sql`
    select
      round(avg(stars)::numeric, 2)::float8 as ratings_avg,
      count(*) filter (where would_recommend is true)::float8
        / nullif(count(*) filter (where would_recommend is not null), 0) as recommend_rate
    from ratings
  `);

  const [eventStats] = await db.execute<{ avg_minutes: number | null }>(sql`
    select round(avg(extract(epoch from (first_event.confirmed_at - r.created_at)) / 60)::numeric, 1)::float8
      as avg_minutes
    from rides r
    join lateral (
      select min(created_at) as confirmed_at
      from ride_events
      where ride_id = r.id and to_status = 'MOTORISTA_CONFIRMADO'
    ) first_event on first_event.confirmed_at is not null
  `);

  const [driverStats] = await db.execute<{ candidates: number; verified: number }>(sql`
    select
      count(*)::int as candidates,
      count(*) filter (where verification = 'VERIFICADO')::int as verified
    from drivers
  `);

  const [supportStats] = await db.execute<{ open: number; urgent: number }>(sql`
    select
      count(*) filter (where status <> 'RESOLVIDO')::int as open,
      count(*) filter (where status <> 'RESOLVIDO' and priority = 'URGENTE')::int as urgent
    from support_requests
  `);

  const countRows = await db.execute<{ status: string; total: number }>(sql`
    select status::text as status, count(*)::int as total from rides group by status
  `);
  const byStatus: Record<string, number> = {};
  for (const row of countRows) byStatus[row.status] = Number(row.total);

  return {
    requestsTotal: Number(totals?.requests_total ?? 0),
    requestsToday: Number(totals?.requests_today ?? 0),
    confirmedTotal: Number(totals?.confirmed_total ?? 0),
    paidTotal: Number(totals?.paid_total ?? 0),
    cancelledTotal: Number(totals?.cancelled_total ?? 0),
    noDriverTotal: Number(totals?.no_driver_total ?? 0),
    ratingsAvg: Number(ratingStats?.ratings_avg ?? 0),
    recommendRate: Number(ratingStats?.recommend_rate ?? 0),
    avgMinutesToDriver:
      eventStats?.avg_minutes == null ? null : Number(eventStats.avg_minutes),
    driversCandidates: Number(driverStats?.candidates ?? 0),
    driversVerified: Number(driverStats?.verified ?? 0),
    supportOpen: Number(supportStats?.open ?? 0),
    supportUrgentOpen: Number(supportStats?.urgent ?? 0),
    byStatus,
  };
}
