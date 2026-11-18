import type { Session, User } from "@supabase/supabase-js";
import type { AuthSessionDTO } from "@nzila/shared";
import { secureStorage } from "./storage";

const STORAGE_KEY = "nzila.auth.session";

let cachedSession: Session | null = null;

function expired(session: Session): boolean {
  if (!session.expires_at) return !session.access_token;
  return session.expires_at * 1000 <= Date.now();
}

export function sessionFromDto(dto: AuthSessionDTO): Session {
  const expiresAt = Math.floor(new Date(dto.expiresAt).getTime() / 1000);
  const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

  return {
    access_token: dto.accessToken,
    refresh_token: "",
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    user: {
      id: dto.user.id,
      email: dto.user.email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "nzila", role: dto.user.role },
      user_metadata: { full_name: dto.user.fullName },
      created_at: new Date().toISOString(),
    } as User,
  } as Session;
}

export async function loadStoredSession(): Promise<Session | null> {
  if (cachedSession) {
    if (!expired(cachedSession)) return cachedSession;
    await clearStoredSession();
    return null;
  }

  const raw = await secureStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Session;
    if (!session.access_token || !session.user?.id || expired(session)) {
      await clearStoredSession();
      return null;
    }
    cachedSession = session;
    return session;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function saveStoredSession(session: Session): Promise<void> {
  cachedSession = session;
  await secureStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  cachedSession = null;
  await secureStorage.removeItem(STORAGE_KEY);
}

export async function getStoredAccessToken(): Promise<string> {
  const session = await loadStoredSession();
  return session?.access_token ?? "";
}
