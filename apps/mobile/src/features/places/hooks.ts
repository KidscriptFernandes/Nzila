import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePlaceInput,
  PlaceCategory,
  PlaceDTO,
  PlaceMessageDTO,
  PlaceMessageInput,
} from "@nzila/shared";
import { api, buildQuery, buildWebSocketUrl, getAccessToken } from "@/lib/api";
import { queryKeys } from "@/lib/query";

export function usePlaces(category?: PlaceCategory, query?: string) {
  return useQuery({
    queryKey: queryKeys.places({ category: category ?? "all", q: query ?? "" }),
    queryFn: () =>
      api<{ items: PlaceDTO[] }>(
        `/v1/places${buildQuery({ category: category ?? undefined, q: query || undefined, limit: 200 })}`,
      ),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAdminPlaces() {
  return useQuery({
    queryKey: queryKeys.adminPlaces,
    queryFn: () => api<{ items: PlaceDTO[] }>("/v1/admin/places"),
    staleTime: 30_000,
  });
}

export function useCreatePlace() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlaceInput) =>
      api<PlaceDTO>("/v1/admin/places", { method: "POST", body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["places"] });
    },
  });
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: queryKeys.place(id),
    queryFn: () => api<PlaceDTO>(`/v1/places/${id}`),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlaceMessages(placeId: string) {
  return useQuery({
    queryKey: queryKeys.placeMessages(placeId),
    queryFn: () =>
      api<{ items: PlaceMessageDTO[] }>(`/v1/places/${placeId}/messages?limit=100`),
    enabled: Boolean(placeId),
    refetchInterval: 7_000,
    staleTime: 2_000,
  });
}

export function useSendPlaceMessage(placeId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceMessageInput) =>
      api<PlaceMessageDTO>(`/v1/places/${placeId}/messages`, {
        method: "POST",
        body: input,
      }),
    onSuccess: (message) => {
      client.setQueryData<{ items: PlaceMessageDTO[] }>(
        queryKeys.placeMessages(placeId),
        (current) => {
          const items = current?.items ?? [];
          if (items.some((item) => item.id === message.id)) {
            return current ?? { items: [] };
          }
          return { items: [...items, message] };
        },
      );
    },
  });
}

function parseRealtimeMessage(raw: unknown): PlaceMessageDTO | null {
  if (typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw) as { type?: unknown; message?: unknown };
    if (parsed.type !== "message" || !parsed.message || typeof parsed.message !== "object") {
      return null;
    }

    const message = parsed.message as Partial<PlaceMessageDTO>;
    if (
      typeof message.id !== "string" ||
      typeof message.placeId !== "string" ||
      typeof message.body !== "string" ||
      typeof message.createdAt !== "string"
    ) {
      return null;
    }

    return message as PlaceMessageDTO;
  } catch {
    return null;
  }
}

export function usePlaceRealtime(placeId: string): { connected: boolean } {
  const client = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!placeId) return;

    let socket: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;

    const stopHeartbeat = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    const connect = async () => {
      const token = await getAccessToken();
      if (!token || closed) return;

      const current = new WebSocket(
        buildWebSocketUrl(`/v1/places/${placeId}/messages/live`, token),
      );
      socket = current;

      current.onopen = () => {
        attempts = 0;
        setConnected(true);
        stopHeartbeat();
        heartbeat = setInterval(() => {
          if (current.readyState === 1) current.send("ping");
        }, 25_000);
      };

      current.onmessage = (event) => {
        const message = parseRealtimeMessage(event.data);
        if (!message) return;

        client.setQueryData<{ items: PlaceMessageDTO[] }>(
          queryKeys.placeMessages(placeId),
          (existing) => {
            const items = existing?.items ?? [];
            if (items.some((item) => item.id === message.id)) {
              return existing ?? { items: [] };
            }
            return { items: [...items, message] };
          },
        );
      };

      current.onclose = () => {
        setConnected(false);
        stopHeartbeat();
        if (closed) return;
        attempts += 1;
        retry = setTimeout(() => void connect(), Math.min(15_000, 1_000 * 2 ** attempts));
      };

      current.onerror = () => {
        current.close();
      };
    };

    void connect();

    return () => {
      closed = true;
      setConnected(false);
      stopHeartbeat();
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [placeId, client]);

  return { connected };
}
