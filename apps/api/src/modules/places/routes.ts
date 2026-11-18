import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { and, asc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import {
  placeMessageSchema,
  placeMessagesQuerySchema,
  placesQuerySchema,
} from "@nzila/shared";
import { places, profiles } from "../../db/schema";
import { verifyAccessToken } from "../../lib/verify-token";
import {
  createPlaceMessage,
  decodePlacePhoto,
  fetchPlaceMessagePhoto,
  fetchPlacePhoto,
  fetchPublishedPlace,
  listPlaceMessages,
  toPlaceDto,
} from "./service";
import {
  broadcastPlaceMessage,
  closePlaceRealtime,
  subscribeToPlace,
} from "./realtime";

const placeIdParams = z.object({ id: z.string().uuid() });
const messageParams = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
});
const liveQuery = z.object({ token: z.string().min(10) });

export const placesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onClose", async () => {
    closePlaceRealtime();
  });

  app.get(
    "/",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        querystring: placesQuerySchema,
        tags: ["places"],
        summary: "Pontos úteis de Luanda",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const { category, q, minLat, minLng, maxLat, maxLng, limit } = req.query;

      const filters: SQL[] = [eq(places.published, true)];
      if (category) filters.push(eq(places.category, category));
      if (q) {
        const search = or(ilike(places.name, `%${q}%`), ilike(places.description, `%${q}%`));
        if (search) filters.push(search);
      }
      if (minLat !== undefined) filters.push(gte(places.lat, minLat));
      if (maxLat !== undefined) filters.push(lte(places.lat, maxLat));
      if (minLng !== undefined) filters.push(gte(places.lng, minLng));
      if (maxLng !== undefined) filters.push(lte(places.lng, maxLng));

      const rows = await app.db
        .select()
        .from(places)
        .where(and(...filters))
        .orderBy(asc(places.name))
        .limit(limit);

      return { items: rows.map(toPlaceDto) };
    },
  );

  app.get(
    "/:id",
    {
      preHandler: app.authenticate,
      schema: {
        params: placeIdParams,
        tags: ["places"],
        summary: "Detalhe de um ponto",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const place = await fetchPublishedPlace(app.db, req.params.id);
      return toPlaceDto(place);
    },
  );

  app.get(
    "/:id/photo",
    {
      config: { rateLimit: { max: 300, timeWindow: "1 minute" } },
      schema: {
        params: placeIdParams,
        tags: ["places"],
        summary: "Foto de um ponto",
      },
    },
    async (req, reply) => {
      const photo = await fetchPlacePhoto(app.db, req.params.id);
      return reply
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .type(photo.mime)
        .send(photo.data);
    },
  );

  app.get(
    "/:id/messages",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
      schema: {
        params: placeIdParams,
        querystring: placeMessagesQuerySchema,
        tags: ["places"],
        summary: "Mensagens da conversa de um ponto",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      await fetchPublishedPlace(app.db, req.params.id);
      const items = await listPlaceMessages(app.db, req.params.id, {
        limit: req.query.limit,
        before: req.query.before,
      });
      return { items };
    },
  );

  app.post(
    "/:id/messages",
    {
      preHandler: app.authenticate,
      bodyLimit: 4_000_000,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        params: placeIdParams,
        body: placeMessageSchema,
        tags: ["places"],
        summary: "Publica uma opinião sobre um ponto",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const actor = req.user!;
      const photo = req.body.photo ? decodePlacePhoto(req.body.photo) : undefined;
      const message = await createPlaceMessage(
        app.db,
        req.params.id,
        actor.id,
        req.body.body,
        photo,
      );

      broadcastPlaceMessage(req.params.id, message);

      return reply.code(201).send(message);
    },
  );

  app.get(
    "/:id/messages/:messageId/photo",
    {
      config: { rateLimit: { max: 300, timeWindow: "1 minute" } },
      schema: {
        params: messageParams,
        tags: ["places"],
        summary: "Foto anexada a uma mensagem",
      },
    },
    async (req, reply) => {
      const photo = await fetchPlaceMessagePhoto(
        app.db,
        req.params.id,
        req.params.messageId,
      );

      return reply
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .type(photo.mime)
        .send(photo.data);
    },
  );

  app.get(
    "/:id/messages/live",
    {
      websocket: true,
      logLevel: "warn",
      schema: {
        params: placeIdParams,
        querystring: liveQuery,
        tags: ["places"],
        summary: "Conversa em tempo real de um ponto",
      },
    },
    async (socket, req) => {
      try {
        const token = await verifyAccessToken(req.query.token);
        const [profile] = await app.db
          .select({ role: profiles.role, active: profiles.active })
          .from(profiles)
          .where(eq(profiles.id, token.id));

        if (!profile || !profile.active) throw new Error("Conta sem perfil ativo");

        await fetchPublishedPlace(app.db, req.params.id);

        const unsubscribe = subscribeToPlace(req.params.id, socket);

        const heartbeat = setInterval(() => {
          if (socket.readyState === 1) socket.ping();
        }, 30_000);

        socket.send(JSON.stringify({ type: "ready", placeId: req.params.id }));

        socket.on("message", (raw) => {
          if (raw.toString() === "ping" && socket.readyState === 1) {
            socket.send("pong");
          }
        });

        socket.on("close", () => {
          clearInterval(heartbeat);
          unsubscribe();
        });

        socket.on("error", () => {
          clearInterval(heartbeat);
          unsubscribe();
        });
      } catch {
        try {
          socket.send(JSON.stringify({ type: "error", message: "Não autorizado" }));
        } catch {
          void 0;
        }
        socket.close(4401, "unauthorized");
      }
    },
  );
};
