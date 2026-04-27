// Pre-renders Hero.png with the five-band tint applied (the same multiply
// blend the homepage performs at runtime via mix-blend-mode). The result
// is consumed by the dynamic Open Graph image at /opengraph-image — Satori,
// the renderer behind it, doesn't honor mix-blend-mode, so we bake the
// painted bag into a static PNG and reference it from the JSX.
//
// Run: node scripts/build-painted-bag.mjs
//
// Output: public/og/painted-bag.png (downscaled, ~150 KB).

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const SRC = "public/texture/Hero.png";
const OUT = "public/og/painted-bag.png";

// Same five-band palette + brightness lift used by HeroBagVisual on /.
const BANDS = [
  "#3F5759", // Pine Smoke
  "#6B9DA7", // Tideglass Blues
  "#D6D9AF", // Olive Cream
  "#F0E196", // Butter Glow
  "#FFF6DF", // Ivory Dune
];
const BRIGHTNESS_LIFT = 1.2;

// Output bag size — well above the 360×540 the OG image renders at, leaving
// retina headroom while keeping the file small.
const OUT_W = 800;
const OUT_H = 1200;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

async function main() {
  await mkdir(dirname(OUT), { recursive: true });

  const src = sharp(SRC);
  const meta = await src.metadata();
  const { width: W, height: H } = meta;
  if (!W || !H) throw new Error("Could not read source dimensions");

  // Step 1 — find the bag's bounding box from the alpha channel. Same scan
  // the homepage runtime does, so the band slicing aligns with the actual
  // bag silhouette rather than the padded image rect.
  const raw = await src
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buf = raw.data;
  const ALPHA_THRESHOLD = 16;
  let leftCol = W;
  let rightCol = -1;
  let topRow = H;
  let bottomRow = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = buf[(y * W + x) * 4 + 3];
      if (a > ALPHA_THRESHOLD) {
        if (x < leftCol) leftCol = x;
        if (x > rightCol) rightCol = x;
        if (y < topRow) topRow = y;
        if (y > bottomRow) bottomRow = y;
      }
    }
  }
  if (rightCol < leftCol) throw new Error("No opaque pixels found in bag");
  const bagW = rightCol - leftCol + 1;
  console.log(
    `Bag bbox: cols ${leftCol}–${rightCol} (${bagW}px), rows ${topRow}–${bottomRow}`,
  );

  // Step 2 — multiply-blend each pixel with the band color it belongs to,
  // then apply the brightness lift. Working directly on the raw buffer is
  // ~5× faster than 5 separate sharp composite calls and gives identical
  // results.
  const bandRgb = BANDS.map(hexToRgb);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (buf[i + 3] <= ALPHA_THRESHOLD) continue;
      if (x < leftCol || x > rightCol) continue;

      const bandFrac = (x - leftCol) / bagW;
      const bandIdx = Math.min(
        Math.floor(bandFrac * BANDS.length),
        BANDS.length - 1,
      );
      const band = bandRgb[bandIdx];

      // Multiply blend, then brightness lift.
      const r = (buf[i] * band.r) / 255;
      const g = (buf[i + 1] * band.g) / 255;
      const b = (buf[i + 2] * band.b) / 255;
      buf[i] = Math.min(255, Math.round(r * BRIGHTNESS_LIFT));
      buf[i + 1] = Math.min(255, Math.round(g * BRIGHTNESS_LIFT));
      buf[i + 2] = Math.min(255, Math.round(b * BRIGHTNESS_LIFT));
    }
  }

  // Step 3 — wrap the modified buffer back into a sharp pipeline, downscale,
  // and write a compressed PNG.
  await sharp(buf, {
    raw: { width: W, height: H, channels: 4 },
  })
    .resize(OUT_W, OUT_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 80 })
    .toFile(OUT);

  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
