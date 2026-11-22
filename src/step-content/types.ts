import React from "react";
import { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";

// content transitions share one motion language for every step swap
export type TrayStepContentProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
  scale?: boolean;
  anchorScaleToTop?: boolean;
  fullScreenBoundaryExit?: boolean;
  stepKey?: string;
  skipEntering?: boolean;
  skipExiting?: boolean;
  // TrayRevealedStepContent, the step stays rendered but hidden
  hidden?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
};
