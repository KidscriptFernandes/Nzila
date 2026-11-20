import type { ApiErrorBody } from "@nzila/shared";
import { getStoredAccessToken } from "./auth-session";
import { env } from "./env";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;
  readonly issues?: unknown;

  constructor(
    message: string,
    status: number,
    code = "UNKNOWN",
    retryAfter?: number,
    issues?: unknown,
  ) {
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
  auth?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export function buildQuery(
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function getAccessToken(): Promise<string> {
  return getStoredAccessToken();
}

export function buildWebSocketUrl(path: string, token: string): string {
  const base = env.apiUrl.replace(/^http/, "ws").replace(/\/+$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export function mediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function api<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    body,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    ...requestInit
  } = options;
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const accessToken = auth ? await getAccessToken() : "";
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;
  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", forwardAbort, { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...requestInit,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiError("O serviço demorou demasiado a responder.", 0, "TIMEOUT");
    }
    if (externalSignal?.aborted) throw error;
    throw new ApiError("Não foi possível contactar o serviço Nzila.", 0, "NETWORK_ERROR");
  } finally {
    if (timer) clearTimeout(timer);
    externalSignal?.removeEventListener("abort", forwardAbort);
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
