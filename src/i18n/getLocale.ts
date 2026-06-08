import { cookies } from "next/headers";

export type Locale = "en" | "zh-TW" | "ja" | "vi" | "en-AU";
export const LOCALES: ReadonlyArray<Locale> = ["en", "zh-TW", "ja", "vi", "en-AU"];
export const DEFAULT_LOCALE: Locale = "en";
export const COOKIE_NAME = "NEXT_LOCALE";

function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
