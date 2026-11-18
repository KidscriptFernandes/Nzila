import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { sql } from "drizzle-orm";
import { env, isProd } from "./config/env";
import { securityPlugin } from "./plugins/security";
import { rateLimitPlugin } from "./plugins/rate-limit";
import { authPlugin } from "./plugins/auth";
import { errorsPlugin } from "./plugins/errors";
import { swaggerPlugin } from "./plugins/swagger";
import { dbPlugin } from "./plugins/db";
import { rawBodyPlugin } from "./plugins/raw-body";
import { meRoutes } from "./modules/auth/routes";
import { authRoutes } from "./modules/auth/session-routes";
import { ridesRoutes } from "./modules/rides/routes";
import { driversRoutes } from "./modules/drivers/routes";
import { placesRoutes } from "./modules/places/routes";
import { supportRoutes } from "./modules/support/routes";
import { ratingsRoutes } from "./modules/ratings/routes";
import { adminRoutes } from "./modules/admin/routes";
import { whatsappRoutes } from "./modules/whatsapp/routes";

export async function buildApp() {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 1_048_576,
    requestIdHeader: "x-request-id",
    genReqId: () => randomUUID(),
    routerOptions: { ignoreTrailingSlash: true },
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "*.password",
          "*.documentNumber",
          "*.temporaryPassword",
        ],
        censor: "[redacted]",
      },
      ...(isProd || env.NODE_ENV === "test"
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
            },
          }),
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorsPlugin);
  await app.register(securityPlugin);
  await app.register(websocket);
  await app.register(rawBodyPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);
  await app.register(dbPlugin);
  await app.register(authPlugin);

  app.get("/health", { config: { rateLimit: false } }, async () => ({
    status: "ok",
    service: "nzila-api",
  }));

  app.get("/ready", { config: { rateLimit: false } }, async (req, reply) => {
    try {
      await req.server.db.execute(sql`select 1`);
      return { status: "ready" };
    } catch (error) {
      req.log.error({ err: error }, "database not ready");
      return reply.code(503).send({ status: "unavailable" });
    }
  });

  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: "/auth" });
      await v1.register(meRoutes, { prefix: "/me" });
      await v1.register(ridesRoutes, { prefix: "/rides" });
      await v1.register(driversRoutes, { prefix: "/drivers" });
      await v1.register(placesRoutes, { prefix: "/places" });
      await v1.register(supportRoutes, { prefix: "/support" });
      await v1.register(ratingsRoutes, { prefix: "/ratings" });
      await v1.register(adminRoutes, { prefix: "/admin" });
    },
    { prefix: "/v1" },
  );

  await app.register(whatsappRoutes, { prefix: "/webhooks/whatsapp" });

  return app;
}
