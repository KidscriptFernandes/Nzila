import type { Session } from "@supabase/supabase-js";
import type {
  AuthSessionDTO,
  OtpRequestResponse,
  RegisterAccountInput,
} from "@nzila/shared";
import { create } from "zustand";
import { api } from "@/lib/api";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  sessionFromDto,
} from "@/lib/auth-session";
import { queryClient } from "@/lib/query";

interface SessionState {
  session: Session | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<Session>;
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
    await clearStoredSession();
    queryClient.clear();
    set({ session: null });
  },
}));
