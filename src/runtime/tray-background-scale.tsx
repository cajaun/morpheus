import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayBackgroundScaleContext =
  createContext<SharedValue<number> | null>(null);

// share background scale with the active tray without coupling provider layout
// provide the shared background scale to the app content tree
export const TrayBackgroundScaleProvider =
  TrayBackgroundScaleContext.Provider;

// read the background scale controlled by fullscreen tray presentation
export const useTrayBackgroundScale = () =>
  useContext(TrayBackgroundScaleContext);
