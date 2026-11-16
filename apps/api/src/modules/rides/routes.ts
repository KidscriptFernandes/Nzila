import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { cancelRideSchema, createRideSchema, ridesQuerySchema } from "@nzila/shared";
import { tryNotify } from "../../lib/notifications";
import {
  createRide,
  getRideDetail,
  listRidesForActor,
  transitionRide,
} from "./service";
import { presentRide } from "./presenter";

const idParams = z.object({ id: z.string().uuid() });

export const ridesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      preHandler: app.requireRole("client"),
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
      schema: {
        body: createRideSchema,
        tags: ["rides"],
        summary: "Cria um pedido de corrida",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const actor = req.user!;
      const ride = await createRide(app.db, actor.id, req.body);
      await tryNotify(app.db, app.log, actor.id, {
        title: "Pedido recebido",
        body: `Recebemos o teu pedido ${ride.reference}. Estamos a procurar o motorista.`,
        rideId: ride.id,
        data: { type: "ride_created" },
      });

      return reply.code(201).send(
        presentRide(ride, {
          actorRole: "client",
          actorId: actor.id,
          events: [],
        }),
      );
    },
  );

  app.get(
    "/",
    {
      preHandler: app.requireRole("client", "driver"),
      schema: {
        querystring: ridesQuerySchema,
        tags: ["rides"],
        summary: "Lista as corridas do utilizador",
        security: [{ bearer: [] }],
      },
    },
    async (req) => listRidesForActor(app.db, req.user!, req.query),
  );

  app.get(
    "/:id",
    {
      schema: {
        params: idParams,
        tags: ["rides"],
        summary: "Detalhe da corrida",
        security: [{ bearer: [] }],
      },
    },
    async (req) => getRideDetail(app.db, req.params.id, req.user!),
  );

  app.post(
    "/:id/confirm",
    {
      preHandler: app.requireRole("client"),
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        params: idParams,
        tags: ["rides"],
        summary: "Cliente confirma a corrida",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      const ride = await transitionRide(app.db, req.params.id, "CLIENTE_CONFIRMADO", actor);

      if (ride.driverId) {
        await tryNotify(app.db, app.log, ride.driverId, {
          title: "Cliente confirmou",
          body: `A corrida ${ride.reference} está confirmada. Consulta os detalhes no app.`,
          rideId: ride.id,
          data: { type: "client_confirmed" },
        });
      }

      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.post(
    "/:id/cancel",
    {
      preHandler: app.requireRole("client", "assistant", "admin"),
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        params: idParams,
        body: cancelRideSchema,
        tags: ["rides"],
        summary: "Cancela a corrida",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      await transitionRide(app.db, req.params.id, "CANCELADO", actor, {
        note: req.body.reason ?? "Cancelada pelo utilizador",
      });
      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.post(
    "/:id/accept",
    {
      preHandler: app.requireRole("driver"),
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        params: idParams,
        tags: ["rides"],
        summary: "Motorista aceita o convite",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      const ride = await transitionRide(app.db, req.params.id, "MOTORISTA_CONFIRMADO", actor, {
        note: "Motorista aceitou o convite",
      });

      await tryNotify(app.db, app.log, ride.clientId, {
        title: "Motorista confirmado",
        body: `Motorista confirmado para ${ride.reference}. Vê a viatura e a matrícula no app.`,
        rideId: ride.id,
        data: { type: "driver_confirmed" },
      });

      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.post(
    "/:id/decline",
    {
      preHandler: app.requireRole("driver"),
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        params: idParams,
        body: z.object({ reason: z.string().trim().max(300).optional() }),
        tags: ["rides"],
        summary: "Motorista recusa o convite (RN07)",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      await transitionRide(app.db, req.params.id, "MOTORISTA_PROCURADO", actor, {
        note: req.body.reason ?? "Motorista recusou",
      });
      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.post(
    "/:id/start",
    {
      preHandler: app.requireRole("driver", "assistant", "admin"),
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        params: idParams,
        tags: ["rides"],
        summary: "Inicia a viagem",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      await transitionRide(app.db, req.params.id, "EM_VIAGEM", actor, {
        note: "Viagem iniciada",
      });
      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.post(
    "/:id/complete",
    {
      preHandler: app.requireRole("driver", "assistant", "admin"),
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        params: idParams,
        tags: ["rides"],
        summary: "Conclui a viagem",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      const ride = await transitionRide(app.db, req.params.id, "CONCLUIDO", actor, {
        note: "Viagem concluída",
      });

      await tryNotify(app.db, app.log, ride.clientId, {
        title: "Viagem concluída",
        body: "Como foi a viagem? Avalia em 10 segundos.",
        rideId: ride.id,
        data: { type: "ride_completed" },
      });

      return getRideDetail(app.db, req.params.id, actor);
    },
  );

};
