import React, { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

export type TrayTransitionDirection = -1 | 0 | 1;
export type TrayFullScreenTransition = "morph" | "slide";

type TrayPageTransitionContextValue = {
  stepKey?: string;
  fullScreen: boolean;
  fullScreenTransition: TrayFullScreenTransition;
  slideCapable: boolean;
  direction: SharedValue<TrayTransitionDirection>;
  slideActive: SharedValue<boolean>;
};

const TrayPageTransitionContext =
  createContext<TrayPageTransitionContextValue | null>(null);

export const TrayPageTransitionProvider = TrayPageTransitionContext.Provider;

export const useTrayPageTransition = () => {
  return useContext(TrayPageTransitionContext);
};
