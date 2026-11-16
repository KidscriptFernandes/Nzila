import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if ([400, 401, 403, 404, 409, 422, 429].includes(error.status)) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "nzila-query-cache",
  throttleTime: 1_000,
});

export const queryKeys = {
  me: ["me"] as const,
  rides: (filters?: Record<string, string | number | undefined>) => ["rides", filters ?? {}] as const,
  ride: (id: string) => ["ride", id] as const,
  places: (filters?: Record<string, string | number | undefined>) =>
    ["places", filters ?? {}] as const,
  support: ["support", "mine"] as const,
  driverMe: ["driver", "me"] as const,
  driverDocuments: ["driver", "documents"] as const,
};
