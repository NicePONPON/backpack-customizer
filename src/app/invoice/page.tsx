"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BillToForm, { EMPTY_BILL_TO, type BillTo } from "@/components/BillToForm";
import InvoiceDocument from "@/components/InvoiceDocument";
import SiteHeader from "@/components/SiteHeader";
import { decodeDesign } from "@/lib/invoiceSerialization";
import {
  CURRENCIES,
  MOQ,
  companyForCurrency,
  type CurrencyCode,
} from "@/lib/pricing";
import { getColorName, getDisplayName } from "@/lib/bagReference";
import { EMBROIDERY_COLORS } from "@/components/EmbroideryControls";
import { ZIPPER_COLORS } from "@/components/ZipperPullControls";

function generateInvoiceNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${day}-${rand}`;
}

function formatToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#555555, #222222)",
  backgroundAttachment: "fixed",
  padding: "24px 16px 120px",
  color: "#fff",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 20,
  padding: "20px 24px",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.7)",
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "#fff",
  fontSize: 12,
  letterSpacing: 0.3,
};

function InvoicePageInner() {
  const searchParams = useSearchParams();
  const d = searchParams.get("d");
  const design = useMemo(() => decodeDesign(d), [d]);

  const [billTo, setBillTo] = useState<BillTo>(EMPTY_BILL_TO);
  const [quantity, setQuantity] = useState<number>(MOQ);
  const [currency, setCurrency] = useState<CurrencyCode>("SZL");
  const [sharing, setSharing] = useState(false);

  const docRef = useRef<HTMLDivElement>(null);
  // Generated client-side only — Math.random() and new Date() would otherwise
  // produce different values during SSR vs hydration and trigger a mismatch.
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    setInvoiceNumber(generateInvoiceNumber());
    setDate(formatToday());
  }, []);

  if (!design) {
    return (
      <main style={pageBg}>
        <SiteHeader />
        <div style={containerStyle}>
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, margin: "8px 0 16px" }}>
              No design to quote
            </h1>
            <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>
              Start by customizing your backpack, then generate a quotation.
            </p>
            <Link
              href="/customize"
              style={{
                display: "inline-block",
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid #fff",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Go to designer
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const embroideryColorName =
    EMBROIDERY_COLORS.find((c) => c.value === design.embroideryColor)?.name ??
    design.embroideryColor;
  const zipperColorName =
    ZIPPER_COLORS.find((c) => c.value === design.zipperColor)?.name ??
    design.zipperColor;

  const backHref = d
    ? `/customize?d=${encodeURIComponent(d)}`
    : "/customize";
  const company = companyForCurrency(currency);

  const handleShare = async () => {
    if (!docRef.current || sharing) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      let drawWidth = pdfWidth;
      let drawHeight = (canvas.height / canvas.width) * pdfWidth;
      let offsetX = 0;
      let offsetY = 0;

      if (drawHeight > pdfHeight) {
        drawHeight = pdfHeight;
        drawWidth = (canvas.width / canvas.height) * pdfHeight;
        offsetX = (pdfWidth - drawWidth) / 2;
      }

      pdf.addImage(imgData, "PNG", offsetX, offsetY, drawWidth, drawHeight);

      const filename = `${invoiceNumber}.pdf`;
      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

      const nav = navigator as Navigator & {
        share?: (data: {
          files?: File[];
          title?: string;
          text?: string;
        }) => Promise<void>;
        canShare?: (data: { files?: File[] }) => boolean;
      };

      if (nav.share && nav.canShare && nav.canShare({ files: [pdfFile] })) {
        try {
          await nav.share({
            files: [pdfFile],
            title: "Design Quotation",
            text: `Your customized backpack quotation — ${invoiceNumber}`,
          });
          return;
        } catch {
          // User cancelled; fall through to download.
        }
      }
      pdf.save(filename);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Sorry — PDF export failed. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <main style={pageBg}>
      <SiteHeader />
      <div style={containerStyle}>
        {/* NAV */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link
            href={backHref}
            style={{
              color: "rgba(255,255,255,0.8)",
              textDecoration: "none",
              fontSize: 14,
              letterSpacing: 0.3,
            }}
          >
            ← Back to editor
          </Link>
        </div>

        {/* BILL TO */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Bill to</div>
          <BillToForm value={billTo} onChange={setBillTo} />
        </div>

        {/* QUANTITY + CURRENCY */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Quantity &amp; currency</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <label style={labelStyle}>
              Quantity (MOQ {MOQ})
              <input
                type="number"
                min={1}
                style={inputStyle}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(0, parseInt(e.target.value || "0", 10)))
                }
              />
            </label>
            <label style={labelStyle}>
              Currency
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option
                    key={c.code}
                    value={c.code}
                    style={{ color: "#111" }}
                  >
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* DOCUMENT PREVIEW */}
        <div style={sectionTitleStyle}>Preview</div>
        <div
          style={{
            overflowX: "auto",
            padding: 0,
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            background: "#fff",
            maxWidth: "100%",
          }}
        >
          <InvoiceDocument
            ref={docRef}
            design={design}
            billTo={billTo}
            quantity={quantity}
            currency={currency}
            invoiceNumber={invoiceNumber}
            date={date}
            getDisplayName={getDisplayName}
            getColorName={getColorName}
            zipperColorName={zipperColorName}
            embroideryColorName={embroideryColorName}
          />
        </div>

        <footer
          style={{
            width: "100%",
            textAlign: "center",
            marginTop: 16,
            color: "rgba(255,255,255,0.45)",
            fontSize: 12,
            lineHeight: 1.6,
            letterSpacing: 0.3,
          }}
        >
          <div>© 2026 {company.name}. All rights reserved.</div>
          <div>Designed and engineered for modern everyday carry.</div>
        </footer>
      </div>

      {/* ACTION BAR */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "12px 16px",
          background:
            "linear-gradient(180deg, rgba(20,20,20,0.5) 0%, rgba(20,20,20,0.85) 100%)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "center",
          zIndex: 20,
        }}
      >
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            padding: "12px 32px",
            borderRadius: 999,
            background: sharing ? "rgba(255,255,255,0.5)" : "#fff",
            color: "#111",
            border: "none",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.5,
            cursor: sharing ? "wait" : "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          }}
        >
          {sharing ? "Generating PDF…" : "Share / Download PDF"}
        </button>
      </div>
    </main>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<main style={pageBg} />}>
      <InvoicePageInner />
    </Suspense>
  );
}
