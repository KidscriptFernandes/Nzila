import type {
  CreatePlaceInput,
  PlaceDTO,
  PlaceMessageDTO,
  Role,
} from "@nzila/shared";
import { and, asc, desc, eq, lt, type SQL } from "drizzle-orm";
import type { DB } from "../../db/client";
import { auditLogs, placeMessages, places, profiles } from "../../db/schema";
import { Errors } from "../../lib/errors";
import type { AuthUser } from "../../plugins/auth";

export interface PlaceMessageQuery {
  limit: number;
  before?: Date;
}

export interface PlacePhotoInput {
  data: Buffer;
  mime: string;
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function matchesPhotoMime(data: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47 &&
      data[4] === 0x0d &&
      data[5] === 0x0a &&
      data[6] === 0x1a &&
      data[7] === 0x0a
    );
  }
  if (mime === "image/webp") {
    return data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
  }
  return false;
}

export function decodePlacePhoto(photo: { mime: string; data: string }): PlacePhotoInput {
  const data = Buffer.from(photo.data, "base64");
  if (!data.length || data.length > MAX_PHOTO_BYTES) {
    throw Errors.badRequest("PHOTO_INVALID", "A foto deve ter no máximo 2 MB");
  }
  if (!matchesPhotoMime(data, photo.mime)) {
    throw Errors.badRequest("PHOTO_INVALID", "Formato de foto não suportado");
  }
  return { data, mime: photo.mime };
}

function placePhotoUrl(place: Pick<typeof places.$inferSelect, "id" | "photoMime">): string | null {
  return place.photoMime ? `/v1/places/${place.id}/photo` : null;
}

export function toPlaceDto(place: typeof places.$inferSelect): PlaceDTO {
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    description: place.description,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    phone: place.phone,
    googleMapsUrl: place.googleMapsUrl,
    published: place.published,
    photoUrl: placePhotoUrl(place),
  };
}

export async function listAllPlaces(db: DB): Promise<PlaceDTO[]> {
  const rows = await db.select().from(places).orderBy(asc(places.name));
  return rows.map(toPlaceDto);
}

export async function createPlace(
  db: DB,
  input: CreatePlaceInput,
  actor: AuthUser,
  ip?: string,
): Promise<PlaceDTO> {
  const photo = input.photo ? decodePlacePhoto(input.photo) : undefined;

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(places)
      .values({
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        address: input.address ?? null,
        lat: input.lat,
        lng: input.lng,
        phone: input.phone ?? null,
        googleMapsUrl: input.googleMapsUrl ?? null,
        photoMime: photo?.mime ?? null,
        photoData: photo?.data ?? null,
        published: input.published,
      })
      .returning();

    if (!row) throw new Error("Falha ao criar local");

    await tx.insert(auditLogs).values({
      actorId: actor.id,
      action: "place.create",
      entity: "places",
      entityId: row.id,
      meta: { name: row.name, category: row.category, published: row.published },
      ip: ip ?? null,
    });

    return toPlaceDto(row);
  });
}

export async function fetchPlacePhoto(db: DB, placeId: string): Promise<PlacePhotoInput> {
  const [row] = await db
    .select({ data: places.photoData, mime: places.photoMime })
    .from(places)
    .where(and(eq(places.id, placeId), eq(places.published, true)));

  if (!row?.data || !row.mime) throw Errors.notFound("Foto");

  return { data: Buffer.from(row.data), mime: row.mime };
}

export async function fetchPublishedPlace(db: DB, placeId: string) {
  const [place] = await db
    .select()
    .from(places)
    .where(and(eq(places.id, placeId), eq(places.published, true)));

  if (!place) throw Errors.notFound("Local");
  return place;
}

const messageSelection = {
  id: placeMessages.id,
  placeId: placeMessages.placeId,
  authorId: placeMessages.authorId,
  body: placeMessages.body,
  photoMime: placeMessages.photoMime,
  createdAt: placeMessages.createdAt,
  authorName: profiles.fullName,
  authorRole: profiles.role,
};

type MessageRow = {
  id: string;
  placeId: string;
  authorId: string;
  body: string;
  photoMime: string | null;
  createdAt: Date;
  authorName: string;
  authorRole: Role;
};

function photoUrl(row: Pick<MessageRow, "id" | "placeId" | "photoMime">): string | null {
  if (!row.photoMime) return null;
  return `/v1/places/${row.placeId}/messages/${row.id}/photo`;
}

function toDto(row: MessageRow): PlaceMessageDTO {
  return {
    id: row.id,
    placeId: row.placeId,
    authorId: row.authorId,
    authorName: row.authorName,
    authorRole: row.authorRole,
    body: row.body,
    photoUrl: photoUrl(row),
    photoMime: row.photoMime,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPlaceMessages(
  db: DB,
  placeId: string,
  query: PlaceMessageQuery,
): Promise<PlaceMessageDTO[]> {
  const filters: SQL[] = [eq(placeMessages.placeId, placeId)];
  if (query.before) filters.push(lt(placeMessages.createdAt, query.before));

  const rows = await db
    .select(messageSelection)
    .from(placeMessages)
    .innerJoin(profiles, eq(profiles.id, placeMessages.authorId))
    .where(and(...filters))
    .orderBy(desc(placeMessages.createdAt))
    .limit(query.limit);

  return rows.reverse().map(toDto);
}

export async function createPlaceMessage(
  db: DB,
  placeId: string,
  authorId: string,
  body: string,
  photo?: PlacePhotoInput,
): Promise<PlaceMessageDTO> {
  await fetchPublishedPlace(db, placeId);

  const [message] = await db
    .insert(placeMessages)
    .values({
      placeId,
      authorId,
      body,
      photoMime: photo?.mime ?? null,
      photoData: photo?.data ?? null,
    })
    .returning();

  if (!message) throw new Error("Falha ao publicar mensagem");

  const [author] = await db
    .select({ authorName: profiles.fullName, authorRole: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, authorId));

  if (!author) throw Errors.forbidden("Conta sem perfil Nzila");

  return toDto({ ...message, ...author });
}

export async function fetchPlaceMessagePhoto(
  db: DB,
  placeId: string,
  messageId: string,
): Promise<PlacePhotoInput> {
  const [row] = await db
    .select({
      data: placeMessages.photoData,
      mime: placeMessages.photoMime,
    })
    .from(placeMessages)
    .innerJoin(places, eq(places.id, placeMessages.placeId))
    .where(
      and(
        eq(placeMessages.id, messageId),
        eq(placeMessages.placeId, placeId),
        eq(places.published, true),
      ),
    );

  if (!row?.data || !row.mime) throw Errors.notFound("Foto");

  return { data: Buffer.from(row.data), mime: row.mime };
}
