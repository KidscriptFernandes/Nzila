import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { eq } from "drizzle-orm";
import { pushTokenSchema, updateProfileSchema } from "@nzila/shared";
import { auditLogs, profiles as profilesTable, pushTokens } from "../../db/schema";
import { getMe, updateMe } from "./service";

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/",
    {
      schema: {
        tags: ["me"],
        summary: "Perfil atual",
        security: [{ bearer: [] }],
      },
    },
    async (req) => getMe(app.db, req.user!.id),
  );

  app.patch(
    "/",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        body: updateProfileSchema,
        tags: ["me"],
        summary: "Atualiza o perfil",
        security: [{ bearer: [] }],
      },
    },
    async (req) => updateMe(app.db, req.user!.id, req.body),
  );

  app.post(
    "/push-token",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: pushTokenSchema,
        tags: ["me"],
        summary: "Regista token de notificações",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      await app.db
        .insert(pushTokens)
        .values({
          profileId: req.user!.id,
          token: req.body.token,
          platform: req.body.platform,
        })
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: { profileId: req.user!.id, platform: req.body.platform },
        });

      return reply.code(204).send();
    },
  );

  app.delete(
    "/",
    {
      config: { rateLimit: { max: 3, timeWindow: "1 hour" } },
      schema: {
        tags: ["me"],
        summary: "Pede eliminação de conta e dados",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const actor = req.user!;

      await app.db.transaction(async (tx) => {
        await tx.update(profilesTable).set({ active: false }).where(eq(profilesTable.id, actor.id));
        await tx.delete(pushTokens).where(eq(pushTokens.profileId, actor.id));
        await tx.insert(auditLogs).values({
          actorId: actor.id,
          action: "account.deletion_requested",
          entity: "profiles",
          entityId: actor.id,
          ip: req.ip,
        });
      });

      return reply.code(202).send({
        requested: true,
        message:
          "Pedido de eliminação registado. A equipa Nzila vai contactar-te para concluir o processo.",
      });
    },
  );
};
