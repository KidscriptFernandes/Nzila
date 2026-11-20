import type { TFunction } from "i18next";
import { ApiError } from "./api";
import { isOffline } from "./connectivity";

const DEFAULT_RETRY_AFTER = 60;

function retryAfterLabel(error: ApiError): string {
  const seconds =
    error.retryAfter && error.retryAfter > 0 ? Math.ceil(error.retryAfter) : DEFAULT_RETRY_AFTER;
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds}s`;
}

export function apiErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return t("auth.invalidCredentials");
      case "EMAIL_TAKEN":
      case "EMAIL_EXISTS":
        return t("auth.alreadyRegistered");
      case "OTP_INVALID":
        return t("auth.otpInvalid");
      case "PLATE_EXISTS":
        return t("errors.plateInUse");
      case "INVALID_TRANSITION":
      case "INVALID_RIDE_STATE":
        return t("errors.invalidTransition");
      case "POLICY_LOCKED":
        return t("errors.policyLocked");
      case "ROUTE_LOCKED":
        return t("errors.routeLocked");
      case "ALREADY_RATED":
        return t("errors.alreadyRated");
      case "WHATSAPP_NOT_CONFIGURED":
        return t("errors.whatsappUnavailable");
      case "VALIDATION_ERROR":
        return t("errors.validation");
      case "RATE_LIMITED":
        return t("errors.rateLimit", { seconds: retryAfterLabel(error) });
    }

    if (error.status === 0) {
      if (error.code === "TIMEOUT") return t("errors.timeout");
      if (isOffline()) return t("errors.offline");
      return t("errors.network");
    }
    if (error.status === 401) return t("errors.unauthorized");
    if (error.status === 403) return t("errors.forbidden");
    if (error.status === 404) return t("errors.notFound");
    if (error.status === 400) return t("errors.validation");
    if (error.status === 409) return t("errors.conflict");
    if (error.status === 422) return t("errors.businessRule");
    if (error.status === 429) {
      return t("errors.rateLimit", { seconds: retryAfterLabel(error) });
    }
    if (error.status >= 500) return t("errors.server");
    return error.message || t("errors.generic");
  }
  if (error instanceof Error && error.message) return error.message;
  return t("errors.generic");
}

export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.code === "NETWORK_ERROR" || error.code === "TIMEOUT")
  );
}
