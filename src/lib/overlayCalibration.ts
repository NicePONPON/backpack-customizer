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
  translateX: -4,
  translateY: -116,
  scaleX: 0.64,
  scaleY: 0.635,
  rotation: 0,
};

export const BACK_CALIBRATION: Calibration = {
  translateX: 0,
  translateY: -116,
  scaleX: 1.025,
  scaleY: 0.715,
  rotation: 0,
};

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

export type ZipperCalibration = {
  leftX: number;
  leftY: number;
  leftRotation: number;
  rightX: number;
  rightY: number;
  rightRotation: number;
};

export const ZIPPER_CALIBRATION: ZipperCalibration = {
  leftX: -43,
  leftY: 65,
  leftRotation: -165,
  rightX: 33,
  rightY: 65,
  rightRotation: 165,
};
