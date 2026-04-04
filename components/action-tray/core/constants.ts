import { Dimensions } from "react-native";

export const HORIZONTAL_MARGIN = 12;
export const BORDER_RADIUS = 40;
export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const SCREEN_WIDTH = Dimensions.get("window").width;
export const MORPH_DURATION = 350;

export const TRAY_SPRING_CONFIG = {
damping: 50, stiffness: 400, mass: 0.8 
} as const;

// export const TRAY_SPRING_CONFIG = {
//   stiffness: 600,
//   damping: 60,
//   mass: 0.9,
//   restSpeedThreshold: 0.01,
//   restDisplacementThreshold: 0.01,
// } as const;

export const TRAY_HORIZONTAL_PADDING = 32;
export const TRAY_VERTICAL_PADDING = 28;
export const TRAY_KEYBOARD_GAP = 12;

export const TRAY_SECTION_GAP = 24;
