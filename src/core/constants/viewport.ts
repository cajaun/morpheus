import { Dimensions } from "react-native";
import {
  DEFAULT_FULL_SCREEN_BACKGROUND_SCALE as RUNTIME_DEFAULT_FULL_SCREEN_BACKGROUND_SCALE,
  FULL_SCREEN_BACKGROUND_SCALE_WIDTH_OFFSET as RUNTIME_FULL_SCREEN_BACKGROUND_SCALE_WIDTH_OFFSET,
  SCREEN_WIDTH as RUNTIME_SCREEN_WIDTH,
} from "../../runtime/viewport";

// viewport dimensions snapshotted for tray geometry worklets
export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const SCREEN_WIDTH = RUNTIME_SCREEN_WIDTH;
export const FULL_SCREEN_BACKGROUND_SCALE_WIDTH_OFFSET =
  RUNTIME_FULL_SCREEN_BACKGROUND_SCALE_WIDTH_OFFSET;
export const DEFAULT_FULL_SCREEN_BACKGROUND_SCALE =
  RUNTIME_DEFAULT_FULL_SCREEN_BACKGROUND_SCALE;

// plain absolute fill, StyleSheet.absoluteFillObject left React Native's types
export const ABSOLUTE_FILL = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
} as const;
