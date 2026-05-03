import type { CurrencyCode } from "@/lib/pricing";

export const CURRENCY_COOKIE_NAME = "NEXT_CURRENCY";
export const DEFAULT_CURRENCY: CurrencyCode = "SZL";
export const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readCurrencyCookie(): CurrencyCode {
  if (typeof document === "undefined") return DEFAULT_CURRENCY;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CURRENCY_COOKIE_NAME}=`));
  const value = match?.split("=")[1];
  if (value === "SZL" || value === "ZAR" || value === "USD" || value === "TWD")
    return value;
  return DEFAULT_CURRENCY;
}

export function writeCurrencyCookie(code: CurrencyCode): void {
  document.cookie = `${CURRENCY_COOKIE_NAME}=${code}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
