import { SignJWT } from "jose";
import type { Role } from "@nzila/shared";
import { env } from "../config/env";

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const issuer = `${env.SUPABASE_URL}/auth/v1`;
const secret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : undefined;

export async function signAccessToken(input: {
  id: string;
  email: string;
  role: Role;
}): Promise<{ token: string; expiresAt: Date }> {
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET é necessário para emitir tokens Nzila");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ACCESS_TOKEN_TTL_SECONDS;

  const token = await new SignJWT({
    email: input.email,
    nzila_role: input.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.id)
    .setIssuer(issuer)
    .setAudience("authenticated")
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(secret);

  return { token, expiresAt: new Date(expiresAt * 1000) };
}
