import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import type { Role } from "@nzila/shared";
import { env } from "../config/env";
import { profiles } from "../db/schema";

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

const issuer = `${env.SUPABASE_URL}/auth/v1`;
const secret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : undefined;
const jwks = env.SUPABASE_JWKS_URL
  ? createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL))
  : undefined;

export const authPlugin = fp(async (app) => {
  app.decorateRequest("user", undefined);

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.unauthorized("Token em falta");
    }

    try {
      const { payload } = await jwtVerify(header.slice(7), jwks ?? secret!, {
        issuer,
        audience: "authenticated",
      });

      const id = payload.sub;
      if (!id) return reply.unauthorized("Token inválido");

      const [profile] = await app.db
        .select({ role: profiles.role, active: profiles.active })
        .from(profiles)
        .where(eq(profiles.id, id));

      if (!profile) return reply.forbidden("Conta sem perfil Nzila");
      if (!profile.active) return reply.forbidden("Conta inativa");

      req.user = {
        id,
        email: typeof payload.email === "string" ? payload.email : undefined,
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
