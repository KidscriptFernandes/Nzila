import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { Platform } from "react-native";
import { create } from "zustand";

export type ConnectivityStatus = "unknown" | "online" | "offline";

function resolveStatus(state: NetInfoState): ConnectivityStatus {
  if (state.isConnected === false) return "offline";
  if (state.isConnected === null) return "unknown";
  if (Platform.OS !== "web" && state.isInternetReachable === false) return "offline";
  return "online";
}

interface ConnectivityState {
  status: ConnectivityStatus;
  apply: (state: NetInfoState) => void;
}

export const useConnectivity = create<ConnectivityState>((set) => ({
  status: "unknown",
  apply: (state) => set({ status: resolveStatus(state) }),
}));

let unsubscribe: (() => void) | null = null;

function applyState(state: NetInfoState): ConnectivityStatus {
  const status = resolveStatus(state);
  useConnectivity.getState().apply(state);
  onlineManager.setOnline(status === "online");
  return status;
}

export function startConnectivityWatcher(): () => void {
  if (unsubscribe) return unsubscribe;

  unsubscribe = NetInfo.addEventListener((state) => {
    applyState(state);
  });

  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

export async function refreshConnectivity(): Promise<boolean> {
  const status = applyState(await NetInfo.fetch());
  return status === "online";
}

export function isOffline(): boolean {
  return useConnectivity.getState().status === "offline";
}
