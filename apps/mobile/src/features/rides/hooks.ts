import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRidePayload,
  Paginated,
  RatingInput,
  RideDTO,
  RideStatus,
} from "@nzila/shared";
import { api, buildQuery } from "@/lib/api";
import { supabaseConfigured } from "@/lib/env";
import { queryKeys, queryClient as globalClient } from "@/lib/query";
import { supabase } from "@/lib/supabase";

export function useMyRides(status?: RideStatus, limit = 50) {
  return useQuery({
    queryKey: queryKeys.rides({ status: status ?? "all", limit }),
    queryFn: () =>
      api<Paginated<RideDTO>>(
        `/v1/rides${buildQuery({ status: status ?? undefined, limit })}`,
      ),
  });
}

export function useRide(id: string) {
  return useQuery({
    queryKey: queryKeys.ride(id),
    queryFn: () => api<RideDTO>(`/v1/rides/${id}`),
    enabled: Boolean(id),
  });
}

function useRideMutation<TInput>(
  id: string,
  path: string,
  method: "POST" = "POST",
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input?: TInput) =>
      api<RideDTO | { declined: boolean }>(`/v1/rides/${id}${path}`, {
        method,
        body: input,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.ride(id) });
      void client.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}

export function useCreateRide() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRidePayload) =>
      api<RideDTO>("/v1/rides", { method: "POST", body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}

export function useConfirmRide(id: string) {
  return useRideMutation(id, "/confirm");
}

export function useCancelRide(id: string) {
  return useRideMutation<{ reason?: string }>(id, "/cancel");
}

export function useAcceptRide(id: string) {
  return useRideMutation(id, "/accept");
}

export function useDeclineRide(id: string) {
  return useRideMutation<{ reason?: string }>(id, "/decline");
}

export function useStartRide(id: string) {
  return useRideMutation(id, "/start");
}

export function useCompleteRide(id: string) {
  return useRideMutation(id, "/complete");
}

export function useArrivedRide(id: string) {
  return useMutation({
    mutationFn: () =>
      api<{ arrived: boolean }>(`/v1/rides/${id}/arrived`, { method: "POST" }),
    onSuccess: () => {
      void globalClient.invalidateQueries({ queryKey: queryKeys.ride(id) });
    },
  });
}

export function useRateRide(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<RatingInput, "rideId">) =>
      api(`/v1/ratings`, { method: "POST", body: { ...input, rideId } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.ride(rideId) });
      void client.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}

export function useRideRealtime(id: string) {
  useEffect(() => {
    if (!id || !supabaseConfigured) return;
    const channel = supabase
      .channel(`ride-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${id}` },
        () => {
          void globalClient.invalidateQueries({ queryKey: queryKeys.ride(id) });
          void globalClient.invalidateQueries({ queryKey: ["rides"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);
}
