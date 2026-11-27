import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { env } from "../config/env";

export interface VerifiedToken {
  id: string;
  email?: string;
  fullName?: string;
  provider?: string;
  providers?: string[];
  emailVerified?: boolean;
}

const issuer = `${env.SUPABASE_URL}/auth/v1`;
const secret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : undefined;

const defaultJwksUrl =
  !env.SUPABASE_JWKS_URL &&
  !env.SUPABASE_URL.endsWith(".local") &&
  env.SUPABASE_URL !== "https://example.supabase.co"
    ? `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`
    : undefined;

const jwksUrl = env.SUPABASE_JWKS_URL ?? defaultJwksUrl;
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : undefined;

export async function verifyAccessToken(token: string): Promise<VerifiedToken> {
  const { alg } = decodeProtectedHeader(token);
  const verifier = alg === "HS256" && secret ? secret : (jwks ?? secret);
  if (!verifier) {
    throw new Error("Configuração de verificação de token em falta");
  }

  const algorithms = verifier === secret ? ["HS256"] : ["ES256", "RS256"];
  const { payload } = await jwtVerify(token, verifier, {
    algorithms,
    issuer,
    audience: "authenticated",
  });

  if (!payload.sub) throw new Error("Token sem identificador de utilizador");

  const appMetadata = payload.app_metadata as Record<string, unknown> | undefined;
  const userMetadata = payload.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    typeof userMetadata?.full_name === "string"
      ? userMetadata.full_name
      : typeof userMetadata?.name === "string"
        ? userMetadata.name
        : undefined;
  const providers = Array.isArray(appMetadata?.providers)
    ? appMetadata.providers.filter((item): item is string => typeof item === "string")
    : undefined;

  return {
    id: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    fullName,
    provider: typeof appMetadata?.provider === "string" ? appMetadata.provider : undefined,
    providers,
    emailVerified:
      typeof userMetadata?.email_verified === "boolean"
        ? userMetadata.email_verified
        : undefined,
  };
}
