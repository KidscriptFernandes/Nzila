import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { eq, sql } from "drizzle-orm";
import { ratingSchema, type RideRatingDTO } from "@nzila/shared";
import { drivers, ratings } from "../../db/schema";
import { Errors } from "../../lib/errors";
import { fetchRideRow } from "../rides/service";

export const ratingsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      preHandler: app.requireRole("client"),
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
      schema: {
        body: ratingSchema,
        tags: ["ratings"],
        summary: "Avalia uma corrida concluída",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const actor = req.user!;
      const ride = await fetchRideRow(app.db, req.body.rideId);

      if (ride.clientId !== actor.id) throw Errors.forbidden();
      if (ride.status !== "CONCLUIDO") {
        throw Errors.businessRule("RATING_NOT_ALLOWED", "Só podes avaliar corridas concluídas");
      }
      if (!ride.driverId) {
        throw Errors.businessRule("RATING_NOT_ALLOWED", "A corrida não tem motorista associado");
      }

      const [existing] = await app.db
        .select({ id: ratings.id })
        .from(ratings)
        .where(eq(ratings.rideId, ride.id));
      if (existing) {
        throw Errors.conflict("ALREADY_RATED", "Esta corrida já foi avaliada");
      }

      const [rating] = await app.db.transaction(async (tx) => {
        const inserted = await tx
          .insert(ratings)
          .values({
            rideId: ride.id,
            clientId: actor.id,
            driverId: ride.driverId!,
            stars: req.body.stars,
            comment: req.body.comment ?? null,
            wouldRecommend: req.body.wouldRecommend ?? null,
          })
          .returning();

        await tx
          .update(drivers)
          .set({
            ratingAvg: sql`round((${drivers.ratingAvg} * ${drivers.ratingCount} + ${req.body.stars}) / (${drivers.ratingCount} + 1), 2)`,
            ratingCount: sql`${drivers.ratingCount} + 1`,
          })
          .where(eq(drivers.id, ride.driverId!));

        return inserted;
      });

      if (!rating) throw new Error("Falha ao registar avaliação");

      const dto: RideRatingDTO = {
        stars: rating.stars,
        comment: rating.comment,
        wouldRecommend: rating.wouldRecommend,
        createdAt: rating.createdAt.toISOString(),
      };

      return reply.code(201).send(dto);
    },
  );
};
