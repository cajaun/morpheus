export const MORPH_ENTERING_DURATION = 280;
export const MORPH_EXITING_DURATION = 190;
export const MORPH_LAYOUT_DURATION = 300;
export const MORPH_ENTERING_SCALE = 0.9;
export const MORPH_EXITING_SCALE = 1.075;

export const FULL_SCREEN_LAYOUT_DURATION = 260;
export const FULL_SCREEN_ENTERING_DURATION = 250;
export const FULL_SCREEN_EXITING_DURATION = 180;

export const TRIGGER_MORPH_DURATION = 140;

// tune tray travel to settle fast without reading as a modal snap
export const TRAY_SPRING_CONFIG = {
  stiffness: 700,
  damping: 62,
  mass: 0.78,
  restSpeedThreshold: 0.15,
  restDisplacementThreshold: 0.15,
} as const;
