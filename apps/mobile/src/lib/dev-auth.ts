import type { Session, User } from "@supabase/supabase-js";
import { env } from "./env";

export const devAuthEnabled = Boolean(env.devAuthToken);

function devUser(): User | null {
  if (!devAuthEnabled) return null;
  return {
    id: env.devAuthUserId,
    email: env.devAuthEmail,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

export function devSession(): Session | null {
  if (!devAuthEnabled) return null;
  const expiresIn = 60 * 60 * 24 * 365;
  return {
    access_token: env.devAuthToken,
    refresh_token: "dev-refresh-token",
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: devUser()!,
  } as Session;
}
