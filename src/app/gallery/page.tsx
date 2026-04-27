"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Gallery, { type GalleryImage } from "@/components/Gallery";
import SizeVisualizer from "@/components/SizeVisualizer";

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#555555, #222222)",
  backgroundAttachment: "fixed",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0 24px 48px",
  gap: 48,
  color: "#fff",
};

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
};

const sectionHeaderStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: 2,
  margin: "0 0 24px",
  color: "#fff",
};

// Advertisement panel — drop new PNGs into public/advertisement/ and add
// their filenames here. Each entry renders as one slide in the carousel.
// Single entries skip the carousel UI and render as a static image.
const AD_IMAGES: ReadonlyArray<{ src: string; alt: string }> = [
  { src: "/advertisement/Test.png", alt: "Computex vs. competitors" },
];

export default function GalleryPage() {
  const [selectedBag, setSelectedBag] = useState<GalleryImage | null>(null);

  return (
    <main style={pageBg}>
      <SiteHeader />

      {/* ADVERTISEMENT — sits above the gallery to highlight comparison /
          marketing content before the user scrolls into product photos. */}
      <section style={{ ...sectionStyle, marginTop: 8 }}>
        <AdvertisementPanel />
      </section>

      {/* GALLERY */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>GALLERY</h2>
        <Gallery onActiveChange={setSelectedBag} />
        <SizeVisualizer
          sizeClass={selectedBag?.sizeClass ?? null}
          bagSlot={
            selectedBag ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={encodeURI(selectedBag.src)}
                alt=""
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                }}
              />
            ) : null
          }
        />
      </section>

      <SiteFooter />
    </main>
  );
}

function AdvertisementPanel() {
  // Carousel only kicks in for 2+ slides. With one image we render it
  // statically to avoid an idle dot indicator and unnecessary state.
  const [index, setIndex] = useState(0);
  const hasMultiple = AD_IMAGES.length > 1;
  const current = AD_IMAGES[index] ?? AD_IMAGES[0];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 20,
        overflow: "hidden",
        background:
          "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.src}
        alt={current.alt}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
      />

      {hasMultiple && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {AD_IMAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show advertisement ${i + 1}`}
              onClick={() => setIndex(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background:
                  i === index ? "#fff" : "rgba(255,255,255,0.4)",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
