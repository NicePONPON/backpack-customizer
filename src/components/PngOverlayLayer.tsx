"use client";

import { useEffect, useState } from "react";
import type { Calibration } from "@/lib/overlayCalibration";

type Props = {
  viewBoxW: number;
  viewBoxH: number;
  pngSrc: string;
  calibration: Calibration;
  debug?: boolean;
};

export default function PngOverlayLayer({
  viewBoxW,
  viewBoxH,
  pngSrc,
  calibration,
  debug = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [pngSrc]);

  if (failed) return null;

  const cx = viewBoxW / 2;
  const cy = viewBoxH / 2;
  const { translateX, translateY, scaleX, scaleY, rotation } = calibration;

  // SVG transforms apply right-to-left:
  //   1. translate(-cx,-cy) moves the image center to the origin
  //   2. scale and rotate therefore pivot on the original center
  //   3. translate(cx,cy) moves the image back
  //   4. translate(translateX,translateY) applies the user offset last
  const transform = [
    `translate(${translateX} ${translateY})`,
    `translate(${cx} ${cy})`,
    `rotate(${rotation})`,
    `scale(${scaleX} ${scaleY})`,
    `translate(${-cx} ${-cy})`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        mixBlendMode: "multiply",
        pointerEvents: "none",
        zIndex: 3,
        opacity: debug ? 0.5 : 1,
      }}
    >
      <image
        href={pngSrc}
        x={0}
        y={0}
        width={viewBoxW}
        height={viewBoxH}
        transform={transform}
        preserveAspectRatio="xMidYMid meet"
        onError={() => setFailed(true)}
      />
    </svg>
  );
}
