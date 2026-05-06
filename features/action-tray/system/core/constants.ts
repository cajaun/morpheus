import { Dimensions, Easing } from "react-native";

export const HORIZONTAL_MARGIN = 12;
export const BORDER_RADIUS = 40;
export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const SCREEN_WIDTH = Dimensions.get("window").width;
export const MORPH_DURATION = 350;
export const TRIGGER_MORPH_DURATION = 175;
export const EXPAND_FROM_TRIGGER_OPEN_DURATION = TRIGGER_MORPH_DURATION;
export const EXPAND_FROM_TRIGGER_CLOSE_DURATION = TRIGGER_MORPH_DURATION;
export const EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT = 50;
export const EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET = 2;
export const EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN = 28;
export const EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET = 0;
export const EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS = 0.04;


// tuned to settle fast without reading as a modal snap
export const TRAY_SPRING_CONFIG = {
  stiffness: 700,
  damping: 62,
  mass: 0.78,
  restSpeedThreshold: 0.15,
  restDisplacementThreshold: 0.15,
} as const;

export const TRAY_HORIZONTAL_PADDING = 32;
export const TRAY_VERTICAL_PADDING = 28;
export const TRAY_KEYBOARD_GAP = 0;

export const TRAY_SECTION_GAP = 24;
