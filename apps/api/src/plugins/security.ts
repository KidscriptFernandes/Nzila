import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import sensible from "@fastify/sensible";
import underPressure from "@fastify/under-pressure";
import { env, isProd } from "../config/env";

export const securityPlugin = fp(async (app) => {
  await app.register(sensible);
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  });
  await app.register(cors, {
    origin: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : false,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: false,
    maxAge: 86_400,
  });
  await app.register(compress);
  await app.register(underPressure, {
    maxEventLoopDelay: 1_000,
    maxHeapUsedBytes: 700 * 1024 * 1024,
    retryAfter: 10,
    exposeStatusRoute: false,
  });
});
