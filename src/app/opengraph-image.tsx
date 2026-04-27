import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Computex Systems — Built for the way you carry.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // Resolve absolute URL for the pre-rendered painted bag. Satori can't do
  // mix-blend-mode at render time, so the five-band tint is baked into a
  // static PNG by scripts/build-painted-bag.mjs (run via `npm run build:og`).
  // Vercel injects VERCEL_URL on every deploy; locally we fall back.
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const heroSrc = `${base}/og/painted-bag.png`;

  // Composition geometry inside the 1200×630 canvas.
  const HERO_HEIGHT = 540;
  const HERO_WIDTH = HERO_HEIGHT * (800 / 1200); // 360, matches painted-bag aspect
  const HERO_LEFT = 90;
  const HERO_TOP = (size.height - HERO_HEIGHT) / 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background:
            "linear-gradient(135deg, #555555 0%, #2a2a2a 60%, #1a1a1a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Painted bag — five touching color bands baked in. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroSrc}
          width={HERO_WIDTH}
          height={HERO_HEIGHT}
          alt=""
          style={{
            position: "absolute",
            left: HERO_LEFT,
            top: HERO_TOP,
            width: HERO_WIDTH,
            height: HERO_HEIGHT,
            objectFit: "contain",
          }}
        />

        {/* Right column: brand + tagline + label. */}
        <div
          style={{
            position: "absolute",
            left: HERO_LEFT + HERO_WIDTH + 80,
            top: 90,
            right: 80,
            bottom: 90,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: 6,
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              Computex Systems
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: -0.5,
                marginBottom: 24,
              }}
            >
              Built for the way you carry.
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: 22,
                fontWeight: 400,
                lineHeight: 1.45,
                maxWidth: 460,
              }}
            >
              Modern everyday backpacks engineered for durability, designed
              without compromise.
            </div>
          </div>

          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Five colors · One silhouette
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
