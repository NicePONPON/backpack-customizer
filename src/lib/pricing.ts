import type { EmbroideryLineSize } from "@/components/EmbroideryControls";

// These are the TAX-INCLUSIVE per-unit SZL prices quoted to customers.
// Pre-tax values are derived at render time by dividing by (1 + tax rate).
export const BASE_PRICES_SZL: Record<"14" | "16", number> = {
  "14": 490,
  "16": 590,
};

export const ZIPPER_UPGRADE_PRICE_SZL = 50;

export const EMBROIDERY_PRICES_SZL: Record<EmbroideryLineSize, number> = {
  small: 20,
  medium: 30,
  large: 40,
  xl: 50,
};

export const MOQ = 200;

export type VolumeTier = {
  minQty: number;
  discount: number;
  label: string;
};

export const VOLUME_TIERS: VolumeTier[] = [
  { minQty: 1000, discount: 0.2, label: "20% volume discount (1,000+ pcs)" },
  { minQty: 500, discount: 0.15, label: "15% volume discount (500+ pcs)" },
  { minQty: 200, discount: 0.1, label: "10% volume discount (200+ pcs)" },
];

export type CurrencyCode = "SZL" | "TWD" | "ZAR" | "USD";

export type CompanyInfo = {
  name: string;
  brand: string;
  tagline: string;
  country: string;
};

// Eswatini entity — trades as Computex Systems locally
export const COMPANY_ESWATINI: CompanyInfo = {
  name: "Computex Systems Investments (PTY) LTD",
  brand: "Computex Systems",
  tagline: "Built for the way you carry.",
  country: "Eswatini",
};

// South Africa — same African brand, ZAR billing
export const COMPANY_ZA: CompanyInfo = {
  name: "Computex Systems Investments (PTY) LTD",
  brand: "Computex Systems",
  tagline: "Built for the way you carry.",
  country: "South Africa",
};

// Taiwan parent + all other international markets — ANPENG entity, Computex brand
export const COMPANY_INTL: CompanyInfo = {
  name: "安彭國際貿易有限公司 ANPENG International Trading Co., Ltd.",
  brand: "Computex Systems",
  tagline: "Built for the way you carry.",
  country: "Taiwan",
};

export function companyForCurrency(code: CurrencyCode): CompanyInfo {
  if (code === "SZL") return COMPANY_ESWATINI;
  if (code === "ZAR") return COMPANY_ZA;
  return COMPANY_INTL;
}

export type CurrencyMeta = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  rateFromSZL: number;
  decimals: number;
  taxRate: number;
  taxLabel: string;
  // Per-currency bag base prices (tax-inclusive, in this currency's units).
  // When set, these override BASE_PRICES_SZL * rateFromSZL for the bag line.
  bagPrices?: Record<"14" | "16", number>;
};

// TODO: finalize FX rates and tax treatment per jurisdiction with finance.
export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  SZL: {
    code: "SZL",
    label: "Eswatini Lilangeni (E)",
    symbol: "E.",
    rateFromSZL: 1,
    decimals: 2,
    taxRate: 0.17,
    taxLabel: "VAT 17%",
  },
  ZAR: {
    code: "ZAR",
    label: "South African Rand (R)",
    symbol: "R ",
    rateFromSZL: 1, // SZL is pegged 1:1 to ZAR.
    decimals: 2,
    taxRate: 0.17, // same VAT treatment as Eswatini
    taxLabel: "VAT 17%",
  },
  USD: {
    code: "USD",
    label: "US Dollar ($)",
    symbol: "$",
    rateFromSZL: 0.1, // 14" = $49, 16" = $59 (pre-tax)
    decimals: 2,
    taxRate: 0,
    taxLabel: "Pre-tax (state tax varies)",
  },
  TWD: {
    code: "TWD",
    label: "New Taiwan Dollar (NT$)",
    symbol: "NT$",
    rateFromSZL: 3.0, // used for zipper / embroidery add-ons
    decimals: 0,
    taxRate: 0.05,
    taxLabel: "VAT 5%",
    bagPrices: { "14": 1490, "16": 1690 }, // independently set; not SZL * rate
  },
};

export function formatCurrency(amountSZL: number, code: CurrencyCode): string {
  const meta = CURRENCIES[code];
  const converted = amountSZL * meta.rateFromSZL;
  const fixed = converted.toFixed(meta.decimals);
  const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${meta.symbol}${withCommas}`;
}

export type LineItem = {
  label: string;
  qty: number;
  unitInclSZL: number;
  unitPreSZL: number;
  lineTotalInclSZL: number;
  lineTotalPreSZL: number;
};

export type PricingInput = {
  size: "14" | "16";
  quantity: number;
  zipperUpgrade: boolean;
  embroideryLineCount: 1 | 2;
  embroideryLineSizes: [EmbroideryLineSize, EmbroideryLineSize];
  embroideryLines: [string, string];
  currency: CurrencyCode;
};

export type PricingBreakdown = {
  lineItems: LineItem[];
  subtotalInclSZL: number;
  subtotalPreSZL: number;
  discountInclSZL: number;
  discountPreSZL: number;
  netInclSZL: number;
  netPreSZL: number;
  taxAmountSZL: number;
  taxRate: number;
  taxLabel: string;
  appliedTier: VolumeTier | null;
  meetsMoq: boolean;
};

function hasText(lines: [string, string], count: 1 | 2): boolean {
  if (count === 1) return lines[0].trim().length > 0;
  return lines[0].trim().length > 0 || lines[1].trim().length > 0;
}

export function computePricing(input: PricingInput): PricingBreakdown {
  const { size, quantity, zipperUpgrade, currency } = input;
  const qty = Math.max(0, Math.floor(quantity));
  const meta = CURRENCIES[currency];
  const taxRate = meta.taxRate;
  const taxLabel = meta.taxLabel;

  const items: LineItem[] = [];

  const makeLine = (label: string, unitInclSZL: number): LineItem => {
    const unitPreSZL = unitInclSZL / (1 + taxRate);
    return {
      label,
      qty,
      unitInclSZL,
      unitPreSZL,
      lineTotalInclSZL: unitInclSZL * qty,
      lineTotalPreSZL: unitPreSZL * qty,
    };
  };

  // Use per-currency bag price if set, otherwise convert from SZL.
  const bagUnitInclSZL = meta.bagPrices
    ? meta.bagPrices[size] / meta.rateFromSZL
    : BASE_PRICES_SZL[size];
  items.push(makeLine(`Base ${size}" backpack`, bagUnitInclSZL));

  if (zipperUpgrade) {
    items.push(
      makeLine("Paracord zipper pull upgrade", ZIPPER_UPGRADE_PRICE_SZL),
    );
  }

  if (hasText(input.embroideryLines, input.embroideryLineCount)) {
    const indices: Array<0 | 1> =
      input.embroideryLineCount === 1 ? [0] : [0, 1];
    for (const idx of indices) {
      if (!input.embroideryLines[idx].trim()) continue;
      const sz = input.embroideryLineSizes[idx];
      const unit = EMBROIDERY_PRICES_SZL[sz];
      const sizeLabel = sz.charAt(0).toUpperCase() + sz.slice(1);
      items.push(makeLine(`Embroidery Line ${idx + 1} (${sizeLabel})`, unit));
    }
  }

  const subtotalInclSZL = items.reduce((s, i) => s + i.lineTotalInclSZL, 0);
  const subtotalPreSZL = items.reduce((s, i) => s + i.lineTotalPreSZL, 0);

  const appliedTier = VOLUME_TIERS.find((t) => qty >= t.minQty) ?? null;
  const discountInclSZL = appliedTier
    ? subtotalInclSZL * appliedTier.discount
    : 0;
  const discountPreSZL = appliedTier
    ? subtotalPreSZL * appliedTier.discount
    : 0;

  const netInclSZL = subtotalInclSZL - discountInclSZL;
  const netPreSZL = subtotalPreSZL - discountPreSZL;
  const taxAmountSZL = netInclSZL - netPreSZL;

  return {
    lineItems: items,
    subtotalInclSZL,
    subtotalPreSZL,
    discountInclSZL,
    discountPreSZL,
    netInclSZL,
    netPreSZL,
    taxAmountSZL,
    taxRate,
    taxLabel,
    appliedTier,
    meetsMoq: qty >= MOQ,
  };
}
