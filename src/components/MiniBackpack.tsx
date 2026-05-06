"use client";

import FrontSVG from "@/components/FrontSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import { FRONT_CALIBRATION, ZIPPER_CALIBRATION } from "@/lib/overlayCalibration";
import type { DesignState } from "@/lib/invoiceSerialization";

const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };

export default function MiniBackpack({
  design,
  size = 140,
}: {
  design: DesignState;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <FrontSVG
        colors={design.colors}
        setSelectedPart={() => {}}
        embroideryLines={["", ""]}
        embroideryLineCount={1}
        embroideryColor="#000000"
        embroideryPosition="top"
        embroideryFont="sans-serif"
        embroideryLineSizes={["medium", "medium"]}
        zipperUpgrade={design.zipperUpgrade}
        zipperColor={design.zipperColor}
        zipperCalibration={ZIPPER_CALIBRATION}
      />
      <PngOverlayLayer
        viewBoxW={FRONT_VIEWBOX.w}
        viewBoxH={FRONT_VIEWBOX.h}
        pngSrc="/texture/Front-Overlay.png"
        calibration={FRONT_CALIBRATION}
      />
    </div>
  );
}
