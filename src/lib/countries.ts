import type { CurrencyCode } from "@/lib/pricing";

export type Country = {
  code: string; // ISO 3166-1 alpha-2 — also drives the flag URL.
  name: string;
  dialCode: string;
};

// Mirrors the supported currencies in pricing.ts. If a new currency is added,
// add the matching country here and update CURRENCY_TO_COUNTRY below.
export const COUNTRIES: Country[] = [
  { code: "SZ", name: "Eswatini", dialCode: "+268" },
  { code: "ZA", name: "South Africa", dialCode: "+27" },
  { code: "TW", name: "Taiwan", dialCode: "+886" },
  { code: "US", name: "United States", dialCode: "+1" },
];

const CURRENCY_TO_COUNTRY: Record<CurrencyCode, string> = {
  SZL: "SZ",
  ZAR: "ZA",
  TWD: "TW",
  USD: "US",
};

export function countryForCurrency(currency: CurrencyCode): Country {
  const code = CURRENCY_TO_COUNTRY[currency];
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

// flagcdn.com is a free public CDN serving PNGs at fixed widths. w80 is small
// enough for the 20–28px circles we render and crisp on retina.
export function flagSrc(code: string): string {
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}
