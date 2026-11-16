import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeResponse, UpdateProfileInput } from "@nzila/shared";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<MeResponse>("/v1/me"),
    enabled,
  });
}

export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api<MeResponse>("/v1/me", { method: "PATCH", body: input }),
    onSuccess: (data) => {
      client.setQueryData(queryKeys.me, data);
    },
  });
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: () =>
      api<{ requested: boolean; message: string }>("/v1/me", { method: "DELETE" }),
  });
}
