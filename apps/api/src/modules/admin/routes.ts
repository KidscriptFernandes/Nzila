import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  adminDriversQuerySchema,
  adminRidesQuerySchema,
  adminSupportQuerySchema,
  analyseRideSchema,
  assignDriverSchema,
  cancellationPolicySchema,
  createDriverSchema,
  createPlaceSchema,
  paymentSchema,
  priceSchema,
  updateRideRouteSchema,
  updateSupportSchema,
  verificationUpdateSchema,
} from "@nzila/shared";
import { tryNotify } from "../../lib/notifications";
import { createPlace, listAllPlaces } from "../places/service";
import { getRideDetail, transitionRide } from "../rides/service";
import {
  assignDriverToRide,
  createDriver,
  getMetrics,
  listAdminDrivers,
  listAdminRides,
  listAdminSupport,
  recordCancellationPolicy,
  recordPayment,
  setRidePrice,
  updateDriverVerification,
  updateRideRoute,
  updateSupportRequest,
} from "./service";

const rideParams = z.object({ id: z.string().uuid() });
const driverParams = z.object({ id: z.string().uuid() });
const supportParams = z.object({ id: z.string().uuid() });

function luandaWhen(date: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Africa/Luanda",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", app.requireRole("assistant", "admin"));

  app.get(
    "/rides",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
      schema: {
        querystring: adminRidesQuerySchema,
        tags: ["admin"],
        summary: "Fila de corridas por estado",
        security: [{ bearer: [] }],
      },
    },
    async (req) => listAdminRides(app.db, req.user!, req.query),
  );

  app.patch(
    "/rides/:id/analyse",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
      schema: {
        params: rideParams,
        body: analyseRideSchema,
        tags: ["admin"],
        summary: "Marca pedido em análise",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      await transitionRide(app.db, req.params.id, "EM_ANALISE", req.user!, {
        note: req.body.note ?? "Pedido em análise",
      });
      return getRideDetail(app.db, req.params.id, req.user!);
    },
  );

  app.post(
    "/rides/:id/assign",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        params: rideParams,
        body: assignDriverSchema,
        tags: ["admin"],
        summary: "Atribui motorista e viatura (RN08)",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      const ride = await assignDriverToRide(app.db, req.params.id, req.body, actor, req.ip);

      if (ride.driverId) {
        await tryNotify(app.db, app.log, ride.driverId, {
          title: "Novo convite de corrida",
          body: `Nova corrida às ${luandaWhen(ride.scheduledAt)}: ${ride.origin} → ${ride.destination}.`,
          rideId: ride.id,
          data: { type: "ride_invite" },
        });
      }

      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.patch(
    "/rides/:id/price",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        params: rideParams,
        body: priceSchema,
        tags: ["admin"],
        summary: "Define e confirma o preço (RN04)",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      const ride = await setRidePrice(app.db, req.params.id, req.body, actor, req.ip);

      await tryNotify(app.db, app.log, ride.clientId, {
        title: "Preço pronto",
        body: `O preço da corrida ${ride.reference} está pronto para confirmares.`,
        rideId: ride.id,
        data: { type: "price_ready" },
      });

      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.post(
    "/rides/:id/policy",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        params: rideParams,
        body: cancellationPolicySchema,
        tags: ["admin"],
        summary: "Regista comunicação da política de cancelamento (RN06)",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      const ride = await recordCancellationPolicy(
        app.db,
        req.params.id,
        req.body.cancellationPolicy,
        actor,
        req.ip,
      );

      await tryNotify(app.db, app.log, ride.clientId, {
        title: "Política de cancelamento",
        body: `A política de cancelamento da corrida ${ride.reference} já está disponível no app.`,
        rideId: ride.id,
        data: { type: "cancellation_policy" },
      });

      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.patch(
    "/rides/:id/payment",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        params: rideParams,
        body: paymentSchema,
        tags: ["admin"],
        summary: "Regista pagamento manual",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      await recordPayment(app.db, req.params.id, req.body, req.user!, req.ip);
      return getRideDetail(app.db, req.params.id, req.user!);
    },
  );

  app.patch(
    "/rides/:id/route",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        params: rideParams,
        body: updateRideRouteSchema,
        tags: ["admin"],
        summary: "Altera o percurso e invalida o preço (RN05)",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const actor = req.user!;
      const ride = await updateRideRoute(app.db, req.params.id, req.body, actor, req.ip);

      await tryNotify(app.db, app.log, ride.clientId, {
        title: "Percurso atualizado",
        body: `O percurso da corrida ${ride.reference} foi alterado. Vais receber um novo preço para confirmares.`,
        rideId: ride.id,
        data: { type: "route_changed" },
      });

      return getRideDetail(app.db, req.params.id, actor);
    },
  );

  app.get(
    "/drivers",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        querystring: adminDriversQuerySchema,
        tags: ["admin"],
        summary: "Lista motoristas e estado de verificação",
        security: [{ bearer: [] }],
      },
    },
    async (req) => listAdminDrivers(app.db, req.query),
  );

  app.post(
    "/drivers",
    {
      preHandler: app.requireRole("admin"),
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        body: createDriverSchema,
        tags: ["admin"],
        summary: "Cria motorista, conta e viatura (gera NZ-Mxxx)",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const result = await createDriver(app.db, req.body, req.user!, req.ip);
      return reply.code(201).send(result);
    },
  );

  app.patch(
    "/drivers/:id/verification",
    {
      preHandler: app.requireRole("admin"),
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        params: driverParams,
        body: verificationUpdateSchema,
        tags: ["admin"],
        summary: "Atualiza verificação do motorista",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const driver = await updateDriverVerification(
        app.db,
        req.params.id,
        req.body,
        req.user!,
        req.ip,
      );

      if (driver.verification === "VERIFICADO") {
        await tryNotify(app.db, app.log, driver.id, {
          title: "Verificação aprovada",
          body: "O teu perfil de motorista Nzila está verificado. Já podes receber convites.",
          data: { type: "driver_verified" },
        });
      } else if (driver.verification === "REPROVADO") {
        await tryNotify(app.db, app.log, driver.id, {
          title: "Verificação reprovada",
          body: "A tua verificação foi reprovada. Fala com a equipa Nzila para mais detalhes.",
          data: { type: "driver_rejected" },
        });
      }

      return driver;
    },
  );

  app.get(
    "/support",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        querystring: adminSupportQuerySchema,
        tags: ["admin"],
        summary: "Fila de pedidos de ajuda",
        security: [{ bearer: [] }],
      },
    },
    async (req) => listAdminSupport(app.db, req.query),
  );

  app.patch(
    "/support/:id",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        params: supportParams,
        body: updateSupportSchema,
        tags: ["admin"],
        summary: "Atende ou resolve um pedido de ajuda",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const result = await updateSupportRequest(
        app.db,
        req.params.id,
        req.body,
        req.user!,
        req.ip,
      );

      if (result.request.status === "RESOLVIDO" && result.previousStatus !== "RESOLVIDO") {
        await tryNotify(app.db, app.log, result.request.profileId, {
          title: "Pedido de ajuda resolvido",
          body: "A equipa Nzila marcou o teu pedido de ajuda como resolvido.",
          rideId: result.request.rideId ?? undefined,
          data: { type: "support_resolved", supportId: result.request.id },
        });
      }

      return {
        id: result.request.id,
        status: result.request.status,
        handledBy: result.request.handledBy,
        resolvedAt: result.request.resolvedAt?.toISOString() ?? null,
      };
    },
  );

  app.get(
    "/places",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
      schema: {
        tags: ["admin"],
        summary: "Lista todos os pontos, incluindo não publicados",
        security: [{ bearer: [] }],
      },
    },
    async () => ({ items: await listAllPlaces(app.db) }),
  );

  app.post(
    "/places",
    {
      preHandler: app.requireRole("admin"),
      bodyLimit: 4_000_000,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        body: createPlaceSchema,
        tags: ["admin"],
        summary: "Cria um ponto com coordenadas e foto",
        security: [{ bearer: [] }],
      },
    },
    async (req, reply) => {
      const place = await createPlace(app.db, req.body, req.user!, req.ip);
      return reply.code(201).send(place);
    },
  );

  app.get(
    "/metrics",
    {
      preHandler: app.requireRole("admin"),
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        tags: ["admin"],
        summary: "Métricas do MVP",
        security: [{ bearer: [] }],
      },
    },
    async () => getMetrics(app.db),
  );
};
