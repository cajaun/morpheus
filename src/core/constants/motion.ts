export const MORPH_ENTERING_DURATION = 280;
export const MORPH_LAYOUT_DURATION = 300;
// sheet resize curve eases in and settles without overshoot, outgoing content fades on the same curve and duration
export const SHEET_EASING_POINTS = [0.4, 0.6, 0.15, 1] as const;
export const MORPH_ENTERING_SCALE = 0.9;
export const MORPH_EXITING_SCALE = 1.075;

// fullscreen and sheet switch with a quick launch and a long soft landing, fitted to a reference recording
export const FULL_SCREEN_LAYOUT_DURATION = 300;
export const FULL_SCREEN_ENTERING_DURATION = 250;
// UI frames the sheet-to-fullscreen clock waits after the fullscreen step shows, off because holding gave no measurable benefit
export const FULL_SCREEN_ENTER_HOLD_FRAMES = 0;
export const FULL_SCREEN_EXITING_DURATION = 180;
export const FULL_SCREEN_BOUNDARY_CONTENT_SCALE = 1;
export const FULL_SCREEN_SHELL_EASING_POINTS = [
  0.2,
  0.3,
  0.2,
  1,
] as const;
export const FULL_SCREEN_CONTENT_EASING_POINTS = [
  0.42,
  0,
  0.58,
  1,
] as const;
// outgoing content at the fullscreen boundary fades from the first frame so it never sits over the incoming content
export const FULL_SCREEN_CONTENT_EXIT_EASING_POINTS = [
  0,
  0,
  0.58,
  1,
] as const;

export const TRIGGER_MORPH_DURATION = 140;

// tray travel settles fast without reading as a modal snap
export const TRAY_SPRING_CONFIG = {
  stiffness: 700,
  damping: 62,
  mass: 0.78,
  restSpeedThreshold: 0.15,
  restDisplacementThreshold: 0.15,
} as const;
