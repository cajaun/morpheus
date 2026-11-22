import { Dimensions } from "react-native";

// runtime viewport input for resolving public tray options
export const SCREEN_WIDTH = Dimensions.get("window").width;
export const FULL_SCREEN_BACKGROUND_SCALE_WIDTH_OFFSET = 26;
export const DEFAULT_FULL_SCREEN_BACKGROUND_SCALE =
  SCREEN_WIDTH > 0
    ? (SCREEN_WIDTH - FULL_SCREEN_BACKGROUND_SCALE_WIDTH_OFFSET) / SCREEN_WIDTH
    : 1;
