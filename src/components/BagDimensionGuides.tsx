"use client";

import { AnimatePresence, motion } from "framer-motion";

const VIEWBOX = { w: 992.13, h: 992.13 };

const SIZE_DIMENSIONS = {
  "14": { width: 26, height: 39 },
  "16": { width: 29, height: 44 },
} as const;

type ArrowGuide = {
  width: { x1: number; x2: number; y: number };
  height: { y1: number; y2: number; x: number };
};

const ARROW_GUIDES: Record<"14" | "16", ArrowGuide> = {
  "14": {
    width: { x1: 200, x2: 807, y: 32 },
    height: { y1: 48, y2: 914, x: 871 },
  },
  "16": {
    width: { x1: 190, x2: 800, y: 25 },
    height: { y1: 144, y2: 921, x: 876 },
  },
};

const STROKE = "rgba(255,255,255,0.78)";
const STROKE_WIDTH = 3.5;
const ARROW_HEAD = 16;
const SMOOTH_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export default function BagDimensionGuides({
  size,
}: {
  size: "14" | "16";
}) {
  const dims = SIZE_DIMENSIONS[size];
  const guide = ARROW_GUIDES[size];

  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={size}
          viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
          width="100%"
          height="100%"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: SMOOTH_EASE }}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <DoubleArrow
            x1={guide.width.x1}
            y1={guide.width.y}
            x2={guide.width.x2}
            y2={guide.width.y}
          />
          <DimensionLabel
            x={(guide.width.x1 + guide.width.x2) / 2}
            y={guide.width.y}
            text={`${dims.width} cm`}
          />

          <DoubleArrow
            x1={guide.height.x}
            y1={guide.height.y1}
            x2={guide.height.x}
            y2={guide.height.y2}
          />
          <DimensionLabel
            x={guide.height.x}
            y={(guide.height.y1 + guide.height.y2) / 2}
            text={`${dims.height} cm`}
            vertical
          />
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}

function DoubleArrow({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const horizontal = y1 === y2;
  const head = (cx: number, cy: number, dir: 1 | -1) => {
    if (horizontal) {
      return `${cx + dir * ARROW_HEAD},${cy - ARROW_HEAD} ${cx},${cy} ${cx + dir * ARROW_HEAD},${cy + ARROW_HEAD}`;
    }
    return `${cx - ARROW_HEAD},${cy + dir * ARROW_HEAD} ${cx},${cy} ${cx + ARROW_HEAD},${cy + dir * ARROW_HEAD}`;
  };

  return (
    <g
      stroke={STROKE}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={head(x1, y1, 1)} />
      <polyline points={head(x2, y2, -1)} />
    </g>
  );
}

function DimensionLabel({
  x,
  y,
  text,
  vertical = false,
}: {
  x: number;
  y: number;
  text: string;
  vertical?: boolean;
}) {
  const FONT_SIZE = 30;
  const PAD_X = 18;
  const PAD_Y = 9;
  const w = text.length * FONT_SIZE * 0.55 + PAD_X * 2;
  const h = FONT_SIZE + PAD_Y * 2;

  return (
    <g
      transform={
        vertical
          ? `translate(${x},${y}) rotate(90)`
          : `translate(${x},${y})`
      }
    >
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill="#e5e7eb"
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1a1a1a"
        fontSize={FONT_SIZE}
        fontWeight={700}
        fontFamily="inherit"
      >
        {text}
      </text>
    </g>
  );
}
