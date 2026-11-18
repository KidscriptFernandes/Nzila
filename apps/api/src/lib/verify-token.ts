import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

export interface VerifiedToken {
  id: string;
  email?: string;
}

const issuer = `${env.SUPABASE_URL}/auth/v1`;
const secret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : undefined;
const jwks = env.SUPABASE_JWKS_URL
  ? createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL))
  : undefined;

export async function verifyAccessToken(token: string): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(token, jwks ?? secret!, {
    issuer,
    audience: "authenticated",
  });

  if (!payload.sub) throw new Error("Token sem identificador de utilizador");

  return {
    id: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
