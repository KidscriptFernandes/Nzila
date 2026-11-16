import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { desc, eq } from "drizzle-orm";
import {
  supportRequestSchema,
  type SupportRequestDTO,
} from "@nzila/shared";
import { supportRequests } from "../../db/schema";
import { notifyStaff } from "../../lib/notifications";
import { assertRideAccess, fetchRideRow } from "../rides/service";

function toDto(row: typeof supportRequests.$inferSelect): SupportRequestDTO {
  return {
    id: row.id,
    profileId: row.profileId,
    rideId: row.rideId,
    priority: row.priority,
    message: row.message,
    status: row.status,
    handledBy: row.handledBy,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export const supportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      config: { rateLimit: { max: 5, timeWindow: "10 minutes" } },
      schema: {
        body: supportRequestSchema,
        tags: ["support"],
        summary: "Pedido de ajuda",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const actor = req.user!;

      if (req.body.rideId) {
        const ride = await fetchRideRow(app.db, req.body.rideId);
        assertRideAccess(ride, actor);
      }

      const [request] = await app.db
        .insert(supportRequests)
        .values({
          profileId: actor.id,
          rideId: req.body.rideId ?? null,
          priority: req.body.priority,
          message: req.body.message,
        })
        .returning();

      if (!request) throw new Error("Falha ao criar pedido de ajuda");

      if (request.priority === "URGENTE") {
        await notifyStaff(app.db, app.log, {
          title: "URGENTE: novo pedido de ajuda",
          body: request.message.slice(0, 140),
          rideId: request.rideId ?? undefined,
          data: { type: "support_urgent", supportId: request.id },
        });
      }

      return reply.code(201).send(toDto(request));
    },
  );

  app.get(
    "/mine",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        tags: ["support"],
        summary: "Os meus pedidos de ajuda",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const rows = await app.db
        .select()
        .from(supportRequests)
        .where(eq(supportRequests.profileId, req.user!.id))
        .orderBy(desc(supportRequests.createdAt))
        .limit(30);

      return { items: rows.map(toDto) };
    },
  );
};
