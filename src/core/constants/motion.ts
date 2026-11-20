export const MORPH_ENTERING_DURATION = 280;
export const MORPH_LAYOUT_DURATION = 300;
// sheet resize curve: eases in, then settles without overshoot. Outgoing
// content uses the same curve and duration so it fades in lockstep with the sheet
export const SHEET_EASING_POINTS = [0.4, 0.6, 0.15, 1] as const;
export const MORPH_ENTERING_SCALE = 0.9;
export const MORPH_EXITING_SCALE = 1.075;

// fullscreen <-> sheet: a quick launch and a long, soft landing (fitted to a
// reference recording of fullscreen-to-sheet: 50% of the travel by ~67 ms)
export const FULL_SCREEN_LAYOUT_DURATION = 300;
export const FULL_SCREEN_ENTERING_DURATION = 250;
// Optional: hold the sheet -> fullscreen clock for this many UI frames after
// the fullscreen step is shown, so its first native layout and drawing land
// before anything moves. Off: device recordings showed frame drops across all
// transition types (open, sheet steps, both boundary directions) in dev
// builds, with no measurable benefit from holding.
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
// outgoing content at the fullscreen boundary starts fading on the first frame
// instead of easing in, so it does not sit on top of the incoming content
export const FULL_SCREEN_CONTENT_EXIT_EASING_POINTS = [
  0,
  0,
  0.58,
  1,
] as const;

export const TRIGGER_MORPH_DURATION = 140;

// tune tray travel to settle fast without reading as a modal snap
export const TRAY_SPRING_CONFIG = {
  stiffness: 700,
  damping: 62,
  mass: 0.78,
  restSpeedThreshold: 0.15,
  restDisplacementThreshold: 0.15,
} as const;
