import { Dimensions, Easing } from "react-native";

export const HORIZONTAL_MARGIN = 16;
export const BORDER_RADIUS = 40;
export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const SCREEN_WIDTH = Dimensions.get("window").width;
export const MORPH_ENTERING_DURATION = 280;
export const MORPH_EXITING_DURATION = 190;
export const MORPH_LAYOUT_DURATION = 300;
export const MORPH_ENTERING_SCALE = 0.9;
export const MORPH_EXITING_SCALE = 1.075;
export const FULL_SCREEN_LAYOUT_DURATION = 260;
export const FULL_SCREEN_ENTERING_DURATION = 250;
export const FULL_SCREEN_EXITING_DURATION = 180;
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

export const TRAY_HEADER_HORIZONTAL_PADDING = 24;
export const TRAY_SHEET_BODY_HORIZONTAL_PADDING = 24;
export const TRAY_FULL_SCREEN_BODY_HORIZONTAL_PADDING = 32;
export const TRAY_HEADER_PADDING_TOP = 28;
export const TRAY_HEADER_PADDING_BOTTOM = 20;
export const TRAY_SECTION_PADDING_TOP = 16;
export const TRAY_SECTION_PADDING_BOTTOM = 24;
export const TRAY_ITEM_GAP = 16;
export const TRAY_ITEM_RADIUS = 24;
export const FULL_SCREEN_HEADER_HORIZONTAL_PADDING = 16;
export const FULL_SCREEN_HEADER_PADDING_TOP = 24;
export const FULL_SCREEN_HEADER_BOTTOM_GAP = 16;
export const FULL_SCREEN_CONTROL_SIZE = 44;
export const BACKDROP_OPACITY = 1 / 3;
export const TRAY_VERTICAL_PADDING = 28;
export const TRAY_KEYBOARD_GAP = 0;
