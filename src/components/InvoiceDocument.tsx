"use client";

import { forwardRef } from "react";
import InvoiceBagPreview from "@/components/InvoiceBagPreview";
import type { DesignState } from "@/lib/invoiceSerialization";
import type { BillTo } from "@/components/BillToForm";
import { findCountry } from "@/lib/countries";
import {
  companyForCurrency,
  computePricing,
  formatCurrency,
  type CurrencyCode,
} from "@/lib/pricing";

type PartMeta = { displayName: string; colorName: string; hex: string };

type Props = {
  design: DesignState;
  billTo: BillTo;
  quantity: number;
  currency: CurrencyCode;
  invoiceNumber: string;
  date: string;
  getDisplayName: (part: string) => string;
  getColorName: (hex: string) => string;
  zipperColorName: string;
  embroideryColorName: string;
};

const pageStyle: React.CSSProperties = {
  width: 794, // A4 width at 96dpi
  minHeight: 1123, // A4 height at 96dpi
  background: "#fff",
  color: "#1a1a1a",
  fontFamily: "Arial, Helvetica, sans-serif",
  padding: "48px 56px",
  boxSizing: "border-box",
  fontSize: 13,
  lineHeight: 1.45,
};

const h1Style: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: 2,
  margin: 0,
  color: "#111",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "#666",
  marginBottom: 10,
  marginTop: 24,
};

const ruleStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e5e5",
  margin: "24px 0 0",
};

const tableCellPad = "8px 6px";

const InvoiceDocument = forwardRef<HTMLDivElement, Props>(function InvoiceDocument(
  {
    design,
    billTo,
    quantity,
    currency,
    invoiceNumber,
    date,
    getDisplayName,
    getColorName,
    zipperColorName,
    embroideryColorName,
  },
  ref
) {
  const pricing = computePricing({
    size: design.size,
    quantity,
    zipperUpgrade: design.zipperUpgrade,
    embroideryLineCount: design.embroideryLineCount,
    embroideryLineSizes: design.embroideryLineSizes,
    embroideryLines: design.embroideryLines,
    currency,
  });

  const company = companyForCurrency(currency);

  const parts: PartMeta[] = Object.entries(design.colors).map(([part, hex]) => ({
    displayName: getDisplayName(part),
    colorName: getColorName(hex),
    hex,
  }));

  const hasEmbroideryText =
    design.embroideryLines[0].trim().length > 0 ||
    (design.embroideryLineCount === 2 && design.embroideryLines[1].trim().length > 0);

  const embroideryLineText = (idx: 0 | 1) => {
    const text = design.embroideryLines[idx];
    if (!text.trim()) return null;
    const sz = design.embroideryLineSizes[idx];
    const sizeLabel = sz.charAt(0).toUpperCase() + sz.slice(1);
    return `Line ${idx + 1}: "${text}" — ${sizeLabel}`;
  };

  return (
    <div ref={ref} style={pageStyle} id="invoice-doc">
      {/* LOGO */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/logo.png"
          alt="Computex Systems"
          style={{
            height: 80,
            objectFit: "contain",
            filter: "brightness(0)",
          }}
          crossOrigin="anonymous"
        />
      </div>

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>
            {company.name}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            {company.tagline}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1 style={h1Style}>DESIGN QUOTATION</h1>
          <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
            <div>
              <span style={{ color: "#888" }}>Invoice #: </span>
              {invoiceNumber}
            </div>
            <div>
              <span style={{ color: "#888" }}>Date: </span>
              {date}
            </div>
          </div>
        </div>
      </div>

      <hr style={ruleStyle} />

      {/* FROM / BILL TO */}
      <div style={{ display: "flex", gap: 32, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={sectionHeaderStyle}>From</div>
          <div style={{ fontWeight: 600 }}>{company.name}</div>
          <div style={{ color: "#666", fontSize: 12 }}>{company.tagline}</div>
          <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
            {company.country}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={sectionHeaderStyle}>Bill to</div>
          <div style={{ fontWeight: 600 }}>{billTo.name || "—"}</div>
          {billTo.company && <div>{billTo.company}</div>}
          {billTo.email && <div style={{ color: "#555" }}>{billTo.email}</div>}
          {billTo.phone && (
            <div style={{ color: "#555" }}>
              {findCountry(billTo.phoneCountry)?.dialCode
                ? `${findCountry(billTo.phoneCountry)!.dialCode} `
                : ""}
              {billTo.phone}
            </div>
          )}
          {billTo.address && <div style={{ color: "#555" }}>{billTo.address}</div>}
          {billTo.country && <div style={{ color: "#555" }}>{billTo.country}</div>}
        </div>
      </div>

      {/* BAG PREVIEW */}
      <div style={sectionHeaderStyle}>Design preview</div>
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          background: "#fafafa",
        }}
      >
        <InvoiceBagPreview
          design={design}
          width={260}
          gap={16}
          showLabels
        />
      </div>

      {/* CONFIGURATION */}
      <div style={sectionHeaderStyle}>Configuration</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          rowGap: 6,
          fontSize: 13,
        }}
      >
        <div style={{ color: "#888" }}>Size</div>
        <div>{design.size}&quot; backpack</div>

        {parts.length > 0 && (
          <>
            <div style={{ color: "#888" }}>Fabric colors</div>
            <div>
              {parts.map((p) => (
                <div
                  key={p.displayName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      background: p.hex,
                      border: "1px solid #ddd",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ minWidth: 160 }}>{p.displayName}</span>
                  <span style={{ color: "#555" }}>
                    {p.colorName}{" "}
                    <span style={{ color: "#aaa" }}>({p.hex.toUpperCase()})</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {hasEmbroideryText && (
          <>
            <div style={{ color: "#888" }}>Embroidery</div>
            <div>
              <div>
                <span style={{ color: "#555" }}>Position: </span>
                {design.embroideryPosition === "top" ? "Front top" : "Front bottom"}
              </div>
              <div>
                <span style={{ color: "#555" }}>Font: </span>
                {design.embroideryFont === "serif" ? "Serif" : "Sans-Serif"}
              </div>
              <div>
                <span style={{ color: "#555" }}>Thread color: </span>
                {embroideryColorName}{" "}
                <span style={{ color: "#aaa" }}>
                  ({design.embroideryColor.toUpperCase()})
                </span>
              </div>
              {embroideryLineText(0) && <div>{embroideryLineText(0)}</div>}
              {design.embroideryLineCount === 2 && embroideryLineText(1) && (
                <div>{embroideryLineText(1)}</div>
              )}
            </div>
          </>
        )}

        <div style={{ color: "#888" }}>Zipper pull</div>
        <div>
          {design.zipperUpgrade
            ? `Paracord upgrade — ${zipperColorName} (${design.zipperColor.toUpperCase()})`
            : "Stock"}
        </div>
      </div>

      {/* LINE ITEMS */}
      <div style={sectionHeaderStyle}>Line items</div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ color: "#666" }}>
            <th
              rowSpan={2}
              style={{
                textAlign: "left",
                padding: tableCellPad,
                fontWeight: 600,
                borderBottom: "1px solid #ddd",
                verticalAlign: "bottom",
              }}
            >
              Item
            </th>
            <th
              rowSpan={2}
              style={{
                textAlign: "right",
                padding: tableCellPad,
                fontWeight: 600,
                width: 50,
                borderBottom: "1px solid #ddd",
                verticalAlign: "bottom",
              }}
            >
              Qty
            </th>
            <th
              colSpan={2}
              style={{
                textAlign: "center",
                padding: "4px 6px 2px",
                fontWeight: 600,
                borderBottom: "1px solid #eee",
                color: "#888",
                fontSize: 10,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Unit price
            </th>
            <th
              colSpan={2}
              style={{
                textAlign: "center",
                padding: "4px 6px 2px",
                fontWeight: 600,
                borderBottom: "1px solid #eee",
                color: "#888",
                fontSize: 10,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Amount
            </th>
          </tr>
          <tr style={{ color: "#666" }}>
            <th
              style={{
                textAlign: "right",
                padding: "2px 6px 8px",
                fontWeight: 500,
                width: 90,
                borderBottom: "1px solid #ddd",
                fontSize: 11,
                color: "#888",
              }}
            >
              Pre-tax
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "2px 6px 8px",
                fontWeight: 500,
                width: 90,
                borderBottom: "1px solid #ddd",
                fontSize: 11,
                color: "#888",
              }}
            >
              Incl. tax
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "2px 6px 8px",
                fontWeight: 500,
                width: 100,
                borderBottom: "1px solid #ddd",
                fontSize: 11,
                color: "#888",
              }}
            >
              Pre-tax
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "2px 6px 8px",
                fontWeight: 500,
                width: 100,
                borderBottom: "1px solid #ddd",
                fontSize: 11,
                color: "#888",
              }}
            >
              Incl. tax
            </th>
          </tr>
        </thead>
        <tbody>
          {pricing.lineItems.map((li, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #f2f2f2" }}>
              <td style={{ padding: tableCellPad }}>{li.label}</td>
              <td style={{ padding: tableCellPad, textAlign: "right" }}>{li.qty}</td>
              <td style={{ padding: tableCellPad, textAlign: "right", color: "#555" }}>
                {formatCurrency(li.unitPreSZL, currency)}
              </td>
              <td style={{ padding: tableCellPad, textAlign: "right" }}>
                {formatCurrency(li.unitInclSZL, currency)}
              </td>
              <td style={{ padding: tableCellPad, textAlign: "right", color: "#555" }}>
                {formatCurrency(li.lineTotalPreSZL, currency)}
              </td>
              <td style={{ padding: tableCellPad, textAlign: "right" }}>
                {formatCurrency(li.lineTotalInclSZL, currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ padding: tableCellPad, textAlign: "right", color: "#666" }}>
              Subtotal
            </td>
            <td style={{ padding: tableCellPad, textAlign: "right", color: "#555" }}>
              {formatCurrency(pricing.subtotalPreSZL, currency)}
            </td>
            <td style={{ padding: tableCellPad, textAlign: "right" }}>
              {formatCurrency(pricing.subtotalInclSZL, currency)}
            </td>
          </tr>
          {pricing.appliedTier && (
            <tr>
              <td
                colSpan={4}
                style={{ padding: tableCellPad, textAlign: "right", color: "#666" }}
              >
                {pricing.appliedTier.label}
              </td>
              <td
                style={{ padding: tableCellPad, textAlign: "right", color: "#2b7a2b" }}
              >
                −{formatCurrency(pricing.discountPreSZL, currency)}
              </td>
              <td
                style={{ padding: tableCellPad, textAlign: "right", color: "#2b7a2b" }}
              >
                −{formatCurrency(pricing.discountInclSZL, currency)}
              </td>
            </tr>
          )}
          {pricing.taxRate > 0 && (
            <tr>
              <td
                colSpan={4}
                style={{ padding: tableCellPad, textAlign: "right", color: "#666" }}
              >
                {pricing.taxLabel}
              </td>
              <td style={{ padding: tableCellPad, textAlign: "right", color: "#888" }}>
                —
              </td>
              <td style={{ padding: tableCellPad, textAlign: "right" }}>
                {formatCurrency(pricing.taxAmountSZL, currency)}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={4}></td>
            <td
              style={{
                padding: tableCellPad,
                textAlign: "right",
                fontWeight: 700,
                borderTop: "2px solid #111",
                color: "#444",
              }}
            >
              {formatCurrency(pricing.netPreSZL, currency)}
              <div style={{ fontSize: 10, color: "#888", fontWeight: 400 }}>
                Total (pre-tax)
              </div>
            </td>
            <td
              style={{
                padding: tableCellPad,
                textAlign: "right",
                fontWeight: 700,
                borderTop: "2px solid #111",
              }}
            >
              {formatCurrency(pricing.netInclSZL, currency)}
              <div style={{ fontSize: 10, color: "#888", fontWeight: 400 }}>
                Total (incl. {pricing.taxLabel.toLowerCase()})
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      {!pricing.meetsMoq && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            border: "1px solid #f3c893",
            background: "#fff6e8",
            color: "#8a5a1a",
            fontSize: 12,
            borderRadius: 6,
          }}
        >
          Minimum order quantity is 200 pcs. Below MOQ, unit pricing and lead time may differ.
        </div>
      )}

      <hr style={{ ...ruleStyle, marginTop: 32 }} />

      {/* FOOTER */}
      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          color: "#888",
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        <div>
          Prices shown in{" "}
          {currency === "SZL"
            ? "Eswatini Lilangeni (E)"
            : currency === "ZAR"
              ? "South African Rand (R)"
              : currency === "USD"
                ? "US Dollar ($)"
                : "New Taiwan Dollar (NT$)"}
          . Quotation valid for 30 days from date of issue. Final terms subject to
          written confirmation.
        </div>
        <div style={{ marginTop: 4 }}>
          © 2026 {company.name}. All rights reserved. Designed and engineered for
          modern everyday carry.
        </div>
      </div>
    </div>
  );
});

export default InvoiceDocument;
