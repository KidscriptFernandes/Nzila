import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { queryClient } from "@/lib/query";
import { supabase } from "@/lib/supabase";

interface SessionState {
  session: Session | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

let authListenerStarted = false;

export const useSession = create<SessionState>((set) => ({
  session: null,
  initialized: false,
  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, initialized: true });

    if (!authListenerStarted) {
      authListenerStarted = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
        if (!session) queryClient.clear();
      });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    set({ session: null });
  },
}));
