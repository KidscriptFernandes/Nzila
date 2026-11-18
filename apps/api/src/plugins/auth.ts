import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import type { Role } from "@nzila/shared";
import { profiles } from "../db/schema";
import { verifyAccessToken } from "../lib/verify-token";

export type AuthUser = { id: string; email?: string; role: Role };

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: Role[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest("user", undefined);

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.unauthorized("Token em falta");
    }

    try {
      const token = await verifyAccessToken(header.slice(7));

      const [profile] = await app.db
        .select({ role: profiles.role, active: profiles.active })
        .from(profiles)
        .where(eq(profiles.id, token.id));

      if (!profile) return reply.forbidden("Conta sem perfil Nzila");
      if (!profile.active) return reply.forbidden("Conta inativa");

      req.user = {
        id: token.id,
        email: token.email,
        role: profile.role,
      };
    } catch {
      return reply.unauthorized("Token inválido ou expirado");
    }
  });

  app.decorate("requireRole", (...roles: Role[]) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) return reply.unauthorized();
      if (!roles.includes(req.user.role)) return reply.forbidden("Sem permissão");
    };
  });
});
