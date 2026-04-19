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
export const BACK_CALIBRATION: Calibration = { ...IDENTITY_CALIBRATION };

export type ViewKey = "front" | "back";
