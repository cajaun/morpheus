import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayBackgroundScaleContext =
  createContext<SharedValue<number> | null>(null);

// the background scale shared with the app content tree
export const TrayBackgroundScaleProvider =
  TrayBackgroundScaleContext.Provider;

// the background scale fullscreen trays control
export const useTrayBackgroundScale = () =>
  useContext(TrayBackgroundScaleContext);
