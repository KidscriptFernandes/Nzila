import type { ApiErrorBody } from "@nzila/shared";
import { env } from "./env";
import { supabase } from "./supabase";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;
  readonly issues?: unknown;

  constructor(message: string, status: number, code = "UNKNOWN", retryAfter?: number, issues?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.issues = issues;
  }
}

export function retryAfterSeconds(error: unknown): number | undefined {
  return error instanceof ApiError ? error.retryAfter : undefined;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function api<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Sem ligação à API Nzila.", 0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    let payload: ApiErrorBody | null = null;
    try {
      payload = (await response.json()) as ApiErrorBody;
    } catch {
      payload = null;
    }

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;

    throw new ApiError(
      payload?.message ?? `Pedido falhou (${response.status}).`,
      response.status,
      payload?.code ?? "HTTP_ERROR",
      Number.isFinite(retryAfter) ? retryAfter : undefined,
      payload?.issues,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
