import type {
  CreatePlaceInput,
  PlaceCategory,
  PlaceConversationDTO,
  PlaceDTO,
  PlaceMessageDTO,
  Role,
} from "@nzila/shared";
import { and, asc, desc, eq, lt, sql, type SQL } from "drizzle-orm";
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

type ConversationRow = {
  id: string;
  name: string;
  category: PlaceCategory;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  google_maps_url: string | null;
  published: boolean;
  photo_mime: string | null;
  message_id: string;
  message_place_id: string;
  author_id: string;
  body: string;
  message_photo_mime: string | null;
  message_created_at: Date;
  author_name: string;
  author_role: Role;
  message_count: number;
};

export async function listPlaceConversations(
  db: DB,
  query: { q?: string; limit: number },
): Promise<PlaceConversationDTO[]> {
  const search = query.q
    ? sql`and (p.name ilike ${`%${query.q}%`} or coalesce(p.address, '') ilike ${`%${query.q}%`})`
    : sql``;

  const rows = await db.execute<ConversationRow>(sql`
    select
      p.id,
      p.name,
      p.category,
      p.description,
      p.address,
      p.lat,
      p.lng,
      p.phone,
      p.google_maps_url,
      p.published,
      p.photo_mime,
      latest.id as message_id,
      latest.place_id as message_place_id,
      latest.author_id,
      latest.body,
      latest.photo_mime as message_photo_mime,
      latest.created_at as message_created_at,
      author.full_name as author_name,
      author.role::text as author_role,
      stats.message_count
    from places p
    join lateral (
      select pm.*
      from place_messages pm
      where pm.place_id = p.id
      order by pm.created_at desc
      limit 1
    ) latest on true
    inner join profiles author on author.id = latest.author_id
    cross join lateral (
      select count(*)::int as message_count
      from place_messages total
      where total.place_id = p.id
    ) stats
    where p.published = true
    ${search}
    order by latest.created_at desc
    limit ${query.limit}
  `);

  return rows.map((row) => {
    const photoUrl = row.photo_mime ? `/v1/places/${row.id}/photo` : null;
    const messagePhotoUrl = row.message_photo_mime
      ? `/v1/places/${row.message_place_id}/messages/${row.message_id}/photo`
      : null;

    return {
      place: {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        address: row.address,
        lat: Number(row.lat),
        lng: Number(row.lng),
        phone: row.phone,
        googleMapsUrl: row.google_maps_url,
        published: row.published,
        photoUrl,
      },
      lastMessage: {
        id: row.message_id,
        placeId: row.message_place_id,
        authorId: row.author_id,
        authorName: row.author_name,
        authorRole: row.author_role,
        body: row.body,
        photoUrl: messagePhotoUrl,
        photoMime: row.message_photo_mime,
        createdAt: new Date(row.message_created_at).toISOString(),
      },
      messageCount: Number(row.message_count),
    };
  });
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
