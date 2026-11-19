import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  AdminDriverDTO,
  AdminMetricsDTO,
  AdminRideQueueDTO,
  AssignDriverInput,
  CreateDriverInput,
  DriverVerificationStatus,
  PaymentMethod,
  PaymentStatus,
  RideDTO,
  RidePriority,
  RideStatus,
  SupportRequestDTO,
  SupportStatus,
} from "@nzila/shared";
import { api, buildQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query";

export interface AdminRideFilters {
  status?: RideStatus;
  priority?: RidePriority;
  limit?: number;
}

export interface AdminDriverFilters {
  verification?: DriverVerificationStatus;
  q?: string;
  limit?: number;
}

export interface AdminSupportFilters {
  status?: SupportStatus;
  priority?: RidePriority;
  limit?: number;
}

export interface AdminRideRouteInput {
  origin?: string;
  originLat?: number | null;
  originLng?: number | null;
  destination?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
}

function invalidateAdmin(client: QueryClient, rideId?: string) {
  void client.invalidateQueries({ queryKey: ["admin"] });
  void client.invalidateQueries({ queryKey: ["rides"] });
  if (rideId) void client.invalidateQueries({ queryKey: queryKeys.ride(rideId) });
}

export function useAdminMetrics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminMetrics,
    queryFn: () => api<AdminMetricsDTO>("/v1/admin/metrics"),
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminRideQueue(filters: AdminRideFilters = {}) {
  return useQuery({
    queryKey: queryKeys.adminRides({
      status: filters.status,
      priority: filters.priority,
      limit: String(filters.limit ?? 100),
    }),
    queryFn: () =>
      api<AdminRideQueueDTO>(
        `/v1/admin/rides${buildQuery({
          status: filters.status,
          priority: filters.priority,
          limit: filters.limit ?? 100,
        })}`,
      ),
    refetchInterval: 20_000,
  });
}

export function useAdminDrivers(filters: AdminDriverFilters = {}) {
  return useQuery({
    queryKey: queryKeys.adminDrivers({
      verification: filters.verification,
      q: filters.q,
      limit: String(filters.limit ?? 100),
    }),
    queryFn: () =>
      api<{ items: AdminDriverDTO[] }>(
        `/v1/admin/drivers${buildQuery({
          verification: filters.verification,
          q: filters.q || undefined,
          limit: filters.limit ?? 100,
        })}`,
      ),
  });
}

export function useAdminSupport(filters: AdminSupportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.adminSupport({
      status: filters.status,
      priority: filters.priority,
      limit: String(filters.limit ?? 100),
    }),
    queryFn: () =>
      api<{ items: SupportRequestDTO[] }>(
        `/v1/admin/support${buildQuery({
          status: filters.status,
          priority: filters.priority,
          limit: filters.limit ?? 100,
        })}`,
      ),
    refetchInterval: 20_000,
  });
}

export function useAdminAnalyseRide(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) =>
      api<RideDTO>(`/v1/admin/rides/${rideId}/analyse`, {
        method: "PATCH",
        body: note ? { note } : {},
      }),
    onSuccess: () => invalidateAdmin(client, rideId),
  });
}

export function useAdminAssignDriver(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignDriverInput) =>
      api<RideDTO>(`/v1/admin/rides/${rideId}/assign`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateAdmin(client, rideId),
  });
}

export function useAdminSetRidePrice(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { priceKz: number; cancellationPolicy?: string }) =>
      api<RideDTO>(`/v1/admin/rides/${rideId}/price`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateAdmin(client, rideId),
  });
}

export function useAdminCommunicatePolicy(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (cancellationPolicy: string) =>
      api<RideDTO>(`/v1/admin/rides/${rideId}/policy`, {
        method: "POST",
        body: { cancellationPolicy },
      }),
    onSuccess: () => invalidateAdmin(client, rideId),
  });
}

export function useAdminRecordPayment(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { paymentStatus: PaymentStatus; paymentMethod?: PaymentMethod }) =>
      api<RideDTO>(`/v1/admin/rides/${rideId}/payment`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateAdmin(client, rideId),
  });
}

export function useAdminUpdateRideRoute(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminRideRouteInput) =>
      api<RideDTO>(`/v1/admin/rides/${rideId}/route`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateAdmin(client, rideId),
  });
}

export function useAdminRideTransition(rideId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: "start" | "complete" | "cancel"; reason?: string }) =>
      api<RideDTO>(`/v1/rides/${rideId}/${input.action}`, {
        method: "POST",
        body: input.action === "cancel" && input.reason ? { reason: input.reason } : {},
      }),
    onSuccess: () => invalidateAdmin(client, rideId),
  });
}

export function useAdminCreateDriver() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDriverInput) =>
      api<{ driver: AdminDriverDTO; credentials: { email: string; temporaryPassword: string } }>(
        "/v1/admin/drivers",
        { method: "POST", body: input },
      ),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useAdminUpdateDriverVerification(driverId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { verification: DriverVerificationStatus; note?: string }) =>
      api<AdminDriverDTO>(`/v1/admin/drivers/${driverId}/verification`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useAdminUpdateSupport(supportId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: "EM_ATENDIMENTO" | "RESOLVIDO"; note?: string }) =>
      api<unknown>(`/v1/admin/support/${supportId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateAdmin(client),
  });
}
