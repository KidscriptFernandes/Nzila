import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportRequestDTO, SupportRequestInput } from "@nzila/shared";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";

export function useMySupportRequests() {
  return useQuery({
    queryKey: queryKeys.support,
    queryFn: () => api<{ items: SupportRequestDTO[] }>("/v1/support/mine"),
  });
}

export function useCreateSupportRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SupportRequestInput) =>
      api<SupportRequestDTO>("/v1/support", { method: "POST", body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.support });
    },
  });
}
