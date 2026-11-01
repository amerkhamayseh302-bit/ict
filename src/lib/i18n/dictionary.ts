import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import type { Locale } from "@/features/catalog";

export function getDictionary(locale: Locale) {
  return locale === "en" ? en : ar;
}

export function isLocale(value: string): value is Locale {
  return value === "ar" || value === "en";
}
