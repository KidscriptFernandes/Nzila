import { useQuery } from "@tanstack/react-query";
import type { PlaceCategory, PlaceDTO } from "@nzila/shared";
import { api, buildQuery } from "@/lib/api";
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
