import type { TFunction } from "i18next";
import { ApiError } from "./api";

export function apiErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t("errors.network");
    if (error.status === 401) return t("errors.unauthorized");
    if (error.status === 403) return t("errors.forbidden");
    if (error.status === 404) return t("errors.notFound");
    if (error.status === 409) return t("errors.conflict");
    if (error.status === 429) {
      return t("errors.rateLimit", { seconds: `${error.retryAfter ?? 60}s` });
    }
    if (error.status >= 500) return t("errors.server");
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return t("errors.generic");
}
