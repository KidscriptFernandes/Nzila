import { APP_TIMEZONE } from "@nzila/shared";
import { env } from "./env";

export type AppLocale = "pt-AO" | "en" | "fr";

const INTL_LOCALES: Record<AppLocale, string> = {
  "pt-AO": "pt-PT",
  en: "en-GB",
  fr: "fr-FR",
};

function intlLocale(locale: string): string {
  return INTL_LOCALES[locale as AppLocale] ?? "pt-PT";
}

function partsToRecord(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
}

export function formatDate(iso: string, locale = "pt-AO"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

export function formatDateShort(iso: string, locale = "pt-AO"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale = "pt-AO"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale = "pt-AO"): string {
  return `${formatDate(iso, locale)} · ${formatTime(iso, locale)}`;
}

export function formatLongDate(iso: string, locale = "pt-AO"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function luandaDateParts(iso: string): { date: string; time: string } {
  const parts = partsToRecord(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso)),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function luandaDateTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+01:00`).toISOString();
}

export function wallDateParts(date: Date): { date: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function luandaHour(): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return Number(hour);
}

export function greetingKey(): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  const hour = luandaHour();
  if (hour < 12) return "greetingMorning";
  if (hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

export function whatsappUrl(message?: string): string {
  const suffix = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${env.whatsappNumber}${suffix}`;
}

export function googleMapsUrl(lat: number, lng: number, label?: string): string {
  const query = label
    ? encodeURIComponent(`${label} ${lat},${lng}`)
    : encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function coordinate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function relativeRetryLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)} min`;
}
