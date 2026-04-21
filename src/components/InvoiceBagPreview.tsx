"use client";

import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  BACK_SVG_TRANSFORM,
  ZIPPER_CALIBRATION,
} from "@/lib/overlayCalibration";
import type { DesignState } from "@/lib/invoiceSerialization";

const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };
const BACK_VIEWBOX = { w: 622.13, h: 881.02 };
const FRONT_TEXTURE_SRC = "/texture/Front-Overlay.png";
const BACK_TEXTURE_SRC = "/texture/Back-Overlay.png";

const SIZE_SCALE: Record<"14" | "16", number> = {
  "14": 14 / 16,
  "16": 1,
};

// BACK_CALIBRATION squishes the back PNG vertically (scaleY ≈ 0.715), so
// the rendered back bag reads smaller than the front at the same container
// width. Scale the back container up so both bags look equal visual size.
const BACK_VISUAL_SCALE = 1 / 0.715;

const noop = () => {};

type Props = {
  design: DesignState;
  width: number;
  gap?: number;
  showLabels?: boolean;
};

const labelStyle: React.CSSProperties = {
  marginTop: 8,
  textAlign: "center",
  fontSize: 11,
  color: "#666",
  letterSpacing: 1,
  textTransform: "uppercase",
};

export default function InvoiceBagPreview({
  design,
  width,
  gap = 12,
  showLabels = false,
}: Props) {
  const scale = SIZE_SCALE[design.size];
  const backWidth = width * BACK_VISUAL_SCALE;
  // Back container matches front's square size; the oversized back render
  // is positioned flush with the top of the clip window so the bag's head
  // stays visible (the clipped strip at the bottom is empty padding from
  // BACK_CALIBRATION.scaleY).
  const backOverflow = (backWidth - width) / 2;

  return (
    <div
      style={{
        display: "flex",
        gap,
        alignItems: "flex-end",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            position: "relative",
            width,
            height: width,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height: width,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <FrontSVG
              colors={design.colors}
              setSelectedPart={noop}
              embroideryLines={design.embroideryLines}
              embroideryLineCount={design.embroideryLineCount}
              embroideryColor={design.embroideryColor}
              embroideryPosition={design.embroideryPosition}
              embroideryFont={design.embroideryFont}
              embroideryLineSizes={design.embroideryLineSizes}
              zipperUpgrade={design.zipperUpgrade}
              zipperColor={design.zipperColor}
              zipperCalibration={ZIPPER_CALIBRATION}
            />
            <PngOverlayLayer
              viewBoxW={FRONT_VIEWBOX.w}
              viewBoxH={FRONT_VIEWBOX.h}
              pngSrc={FRONT_TEXTURE_SRC}
              calibration={FRONT_CALIBRATION}
              debug={false}
            />
          </div>
        </div>
        {showLabels && <div style={labelStyle}>Front</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            position: "relative",
            width,
            height: width,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: -backOverflow,
              width: backWidth,
              height: backWidth,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <BackSVG
              colors={design.colors}
              setSelectedPart={noop}
              svgTransform={BACK_SVG_TRANSFORM}
            />
            <PngOverlayLayer
              viewBoxW={BACK_VIEWBOX.w}
              viewBoxH={BACK_VIEWBOX.h}
              pngSrc={BACK_TEXTURE_SRC}
              calibration={BACK_CALIBRATION}
              debug={false}
            />
          </div>
        </div>
        {showLabels && <div style={labelStyle}>Back</div>}
      </div>
    </div>
  );
}
