import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { AppLocale } from "./format";
import { en } from "@/locales/en";
import { fr } from "@/locales/fr";
import { pt } from "@/locales/pt";

export function deviceLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode ?? "pt";
  if (code === "en") return "en";
  if (code === "fr") return "fr";
  return "pt-AO";
}

void i18n.use(initReactI18next).init({
  resources: {
    "pt-AO": pt,
    en,
    fr,
  },
  lng: deviceLocale(),
  fallbackLng: "pt-AO",
  supportedLngs: ["pt-AO", "en", "fr"],
  load: "currentOnly",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
