import type { Session } from "@supabase/supabase-js";
import type {
  AuthSessionDTO,
  Locale,
  OtpRequestResponse,
  RegisterAccountInput,
} from "@nzila/shared";
import { create } from "zustand";
import { api } from "@/lib/api";
import { authenticateWithGoogle } from "@/lib/auth-google";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  sessionFromDto,
} from "@/lib/auth-session";
import { supabaseConfigured } from "@/lib/env";
import { queryClient } from "@/lib/query";
import { supabase } from "@/lib/supabase";

interface SessionState {
  session: Session | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<Session>;
  signInWithGoogle: (locale?: Locale) => Promise<Session | null>;
  register: (input: RegisterAccountInput) => Promise<Session>;
  requestOtp: (email: string) => Promise<OtpRequestResponse>;
  verifyOtp: (email: string, code: string) => Promise<Session>;
  signOut: () => Promise<void>;
}

async function persist(dto: AuthSessionDTO): Promise<Session> {
  const session = sessionFromDto(dto);
  await saveStoredSession(session);
  return session;
}

export const useSession = create<SessionState>((set) => ({
  session: null,
  initialized: false,
  initialize: async () => {
    const session = await loadStoredSession();
    set({ session, initialized: true });
  },
  signIn: async (email, password) => {
    const dto = await api<AuthSessionDTO>("/v1/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    const session = await persist(dto);
    queryClient.clear();
    set({ session });
    return session;
  },
  signInWithGoogle: async (locale) => {
    const accessToken = await authenticateWithGoogle();
    if (!accessToken) return null;

    const dto = await api<AuthSessionDTO>("/v1/auth/google", {
      method: "POST",
      body: locale ? { locale } : {},
      headers: { Authorization: `Bearer ${accessToken}` },
      auth: false,
    });
    const session = await persist(dto);
    queryClient.clear();
    set({ session });
    return session;
  },
  register: async (input) => {
    const dto = await api<AuthSessionDTO>("/v1/auth/register", {
      method: "POST",
      body: input,
      auth: false,
    });
    const session = await persist(dto);
    queryClient.clear();
    set({ session });
    return session;
  },
  requestOtp: (email) =>
    api<OtpRequestResponse>("/v1/auth/otp/request", {
      method: "POST",
      body: { email },
      auth: false,
    }),
  verifyOtp: async (email, code) => {
    const dto = await api<AuthSessionDTO>("/v1/auth/otp/verify", {
      method: "POST",
      body: { email, code },
      auth: false,
    });
    const session = await persist(dto);
    queryClient.clear();
    set({ session });
    return session;
  },
  signOut: async () => {
    try {
      await api("/v1/auth/logout", { method: "POST" });
    } catch {
      void 0;
    }
    if (supabaseConfigured) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    await clearStoredSession();
    queryClient.clear();
    set({ session: null });
  },
}));
