import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function localized<T>(value: { ar: T; en: T }, locale: string): T {
  return locale === "en" ? value.en : value.ar;
}
