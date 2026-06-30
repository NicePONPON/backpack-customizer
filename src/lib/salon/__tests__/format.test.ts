import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/salon/format";

describe("formatPrice", () => {
  it("formats SZL with the currency code and two decimals", () => {
    expect(formatPrice(1200, "SZL")).toBe("SZL 1,200.00");
  });

  it("formats zero", () => {
    expect(formatPrice(0, "SZL")).toBe("SZL 0.00");
  });

  it("respects a different currency code", () => {
    expect(formatPrice(99.5, "USD")).toBe("USD 99.50");
  });
});
