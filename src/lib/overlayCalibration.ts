export type Calibration = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export const IDENTITY_CALIBRATION: Calibration = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

export const FRONT_CALIBRATION: Calibration = {
  translateX: 15,
  translateY: 4,
  scaleX: 1.03,
  scaleY: 1.03,
  rotation: 0,
};

// Layout transform applied to the Back SVG content so it sits at the same
// on-screen position as the calibrated Back PNG. Independent of PNG-vs-SVG
// alignment; tune only if you want to move the whole Back view.
export const BACK_SVG_TRANSFORM: Calibration = {
  translateX: 5,
  translateY: -116,
  scaleX: 1.08,
  scaleY: 0.72,
  rotation: 0,
};

// Initialized to BACK_SVG_TRANSFORM so PNG and SVG start co-located. Tune
// via ?calibrate=back to fine-tune PNG relative to the fixed SVG.
export const BACK_CALIBRATION: Calibration = { ...BACK_SVG_TRANSFORM };

export function buildCalibrationTransform(
  cal: Calibration,
  viewBoxW: number,
  viewBoxH: number,
): string {
  const cx = viewBoxW / 2;
  const cy = viewBoxH / 2;
  return [
    `translate(${cal.translateX} ${cal.translateY})`,
    `translate(${cx} ${cy})`,
    `rotate(${cal.rotation})`,
    `scale(${cal.scaleX} ${cal.scaleY})`,
    `translate(${-cx} ${-cy})`,
  ].join(" ");
}

export type ViewKey = "front" | "back";
