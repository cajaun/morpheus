import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayBackgroundScaleContext =
  createContext<SharedValue<number> | null>(null);

export const TrayBackgroundScaleProvider =
  TrayBackgroundScaleContext.Provider;

export const useTrayBackgroundScale = () =>
  useContext(TrayBackgroundScaleContext);
