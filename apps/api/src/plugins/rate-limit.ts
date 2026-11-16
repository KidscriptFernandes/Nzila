import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import Redis from "ioredis";
import type { FastifyRequest } from "fastify";
import { env } from "../config/env";

function tokenSubject(req: FastifyRequest): string | null {
  if (req.user?.id) return req.user.id;

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  try {
    const payload = header.slice(7).split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
    };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export function rateLimitKey(req: FastifyRequest): string {
  const subject = tokenSubject(req);
  return subject ? `u:${subject}` : `ip:${req.ip}`;
}

export const rateLimitPlugin = fp(async (app) => {
  const redis = env.REDIS_URL
    ? new Redis(env.REDIS_URL, {
        connectTimeout: 500,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      })
    : undefined;

  if (redis) {
    redis.on("error", (err) => app.log.warn({ err }, "redis rate-limit indisponível"));
  }

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    redis,
    nameSpace: "nzila:rl:",
    skipOnError: true,
    keyGenerator: rateLimitKey,
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      code: "RATE_LIMITED",
      message: `Muitas tentativas. Tenta novamente em ${Math.ceil(ctx.ttl / 1000)} segundos.`,
    }),
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
  });

  app.setNotFoundHandler(
    { preHandler: app.rateLimit({ max: 20, timeWindow: "1 minute" }) },
    (_req, reply) => reply.code(404).send({ code: "NOT_FOUND", message: "Rota não encontrada" }),
  );

  app.addHook("onClose", async () => {
    if (redis) await redis.quit().catch(() => undefined);
  });
});
