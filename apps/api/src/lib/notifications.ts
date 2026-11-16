import { and, eq, inArray } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import type { DB } from "../db/client";
import { notifications, profiles, pushTokens } from "../db/schema";
import { isTest } from "../config/env";

export interface PushPayload {
  title: string;
  body: string;
  rideId?: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function notifyProfile(
  db: DB,
  log: FastifyBaseLogger,
  profileId: string,
  payload: PushPayload,
): Promise<void> {
  const [notification] = await db
    .insert(notifications)
    .values({
      profileId,
      rideId: payload.rideId ?? null,
      channel: "push",
      title: payload.title,
      body: payload.body,
      meta: payload.data ?? null,
    })
    .returning({ id: notifications.id });

  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.profileId, profileId));

  if (!tokens.length) {
    if (notification) {
      await db
        .update(notifications)
        .set({ status: "SEM_TOKEN" })
        .where(eq(notifications.id, notification.id));
    }
    return;
  }

  if (isTest) {
    if (notification) {
      await db
        .update(notifications)
        .set({ status: "ENVIADO", sentAt: new Date() })
        .where(eq(notifications.id, notification.id));
    }
    return;
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(
        tokens.map(({ token }) => ({
          to: token,
          title: payload.title,
          body: payload.body,
          sound: "default",
          data: { ...payload.data, rideId: payload.rideId },
        })),
      ),
    });

    if (!response.ok) throw new Error(`Expo Push ${response.status}`);

    if (notification) {
      await db
        .update(notifications)
        .set({ status: "ENVIADO", sentAt: new Date() })
        .where(eq(notifications.id, notification.id));
    }
  } catch (error) {
    log.warn({ err: error, profileId }, "falha ao enviar push");
    if (notification) {
      await db
        .update(notifications)
        .set({ status: "FALHOU" })
        .where(eq(notifications.id, notification.id));
    }
  }
}

export async function notifyStaff(
  db: DB,
  log: FastifyBaseLogger,
  payload: PushPayload,
): Promise<void> {
  const staff = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(inArray(profiles.role, ["assistant", "admin"]), eq(profiles.active, true)));

  await Promise.all(
    staff.map((member) => notifyProfile(db, log, member.id, payload).catch(() => undefined)),
  );
}

export async function tryNotify(
  db: DB,
  log: FastifyBaseLogger,
  profileId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    await notifyProfile(db, log, profileId, payload);
  } catch (error) {
    log.warn({ err: error, profileId }, "notificação falhou");
  }
}
