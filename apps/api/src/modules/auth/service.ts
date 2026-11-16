import { eq } from "drizzle-orm";
import type {
  ClientProfileDTO,
  DriverProfileDTO,
  MeResponse,
  ProfileDTO,
  UpdateProfileInput,
} from "@nzila/shared";
import type { DB } from "../../db/client";
import {
  clients,
  driverDocuments,
  drivers,
  profiles,
  vehicles,
} from "../../db/schema";
import { Errors } from "../../lib/errors";

export async function getMe(db: DB, userId: string): Promise<MeResponse> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!profile) throw Errors.notFound("Perfil");

  let client: ClientProfileDTO | null = null;
  let driver: DriverProfileDTO | null = null;

  if (profile.role === "client") {
    const [clientRow] = await db.select().from(clients).where(eq(clients.id, userId));
    if (clientRow) {
      client = {
        nationality: clientRow.nationality,
        arrivalDate: clientRow.arrivalDate,
        hotel: clientRow.hotel,
      };
    }
  }

  if (profile.role === "driver") {
    const [driverRow] = await db.select().from(drivers).where(eq(drivers.id, userId));
    if (driverRow) {
      const vehicleRows = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.driverId, userId));

      const documentRows = await db
        .select()
        .from(driverDocuments)
        .where(eq(driverDocuments.driverId, userId));

      driver = {
        code: driverRow.code,
        verification: driverRow.verification,
        verifiedAt: driverRow.verifiedAt?.toISOString() ?? null,
        zones: driverRow.zones,
        ratingAvg: driverRow.ratingAvg,
        ratingCount: driverRow.ratingCount,
        available: driverRow.available,
        vehicles: vehicleRows.map((vehicle) => ({
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          color: vehicle.color,
          plate: vehicle.plate,
          seats: vehicle.seats,
          active: vehicle.active,
        })),
        documents: documentRows.map((document) => ({
          id: document.id,
          type: document.type,
          expiresAt: document.expiresAt?.toISOString() ?? null,
          createdAt: document.createdAt.toISOString(),
        })),
      };
    }
  }

  const profileDto: ProfileDTO = {
    id: profile.id,
    role: profile.role,
    fullName: profile.fullName,
    whatsapp: profile.whatsapp,
    locale: profile.locale as ProfileDTO["locale"],
    active: profile.active,
    consentAt: profile.consentAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    client,
    driver,
  };

  return { profile: profileDto, client, driver };
}

export async function updateMe(
  db: DB,
  userId: string,
  input: UpdateProfileInput,
): Promise<MeResponse> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!profile) throw Errors.notFound("Perfil");

  await db.transaction(async (tx) => {
    const profilePatch: Partial<typeof profiles.$inferInsert> = {};
    if (input.fullName !== undefined) profilePatch.fullName = input.fullName;
    if (input.whatsapp !== undefined) profilePatch.whatsapp = input.whatsapp;
    if (input.locale !== undefined) profilePatch.locale = input.locale;

    if (Object.keys(profilePatch).length) {
      await tx.update(profiles).set(profilePatch).where(eq(profiles.id, userId));
    }

    if (profile.role === "client") {
      const clientPatch: Partial<typeof clients.$inferInsert> = {};
      if (input.nationality !== undefined) clientPatch.nationality = input.nationality;
      if (input.arrivalDate !== undefined) clientPatch.arrivalDate = input.arrivalDate;
      if (input.hotel !== undefined) clientPatch.hotel = input.hotel;

      if (Object.keys(clientPatch).length) {
        await tx
          .insert(clients)
          .values({ id: userId, ...clientPatch })
          .onConflictDoUpdate({ target: clients.id, set: clientPatch });
      }
    }
  });

  return getMe(db, userId);
}
