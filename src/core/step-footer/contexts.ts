import React from "react";
import Animated, { type SharedValue } from "react-native-reanimated";

// written by the footer and read by the sheet, the footer measures first in a step-change commit so the step's height includes it
export type TrayStepFooterMetrics = {
  // height of the current step's footer, 0 without one
  heightRef: { current: number };
  height: SharedValue<number>;
  // set by the sheet to re-report the content height after the footer alone resized
  remeasureContentRef: { current: (() => void) | null };
};

export const TrayStepFooterMetricsContext =
  React.createContext<TrayStepFooterMetrics | null>(null);

// the shell's footer content frame style, the sheet grid width
export const TrayStepFooterFrameStyleContext =
  React.createContext<React.ComponentProps<typeof Animated.View>["style"]>(
    undefined,
  );

// the pinned footer layer element for trays that render footers per step
export const TrayStepFooterRegionContext =
  React.createContext<React.ReactNode>(null);

// how the step's footer animates, read by its backing inside the sheet so the two fade as one
export type TrayStepFooterMotionFlags = {
  skipEntering: boolean;
  fullScreenBoundaryExit: boolean;
};

export const TrayStepFooterMotionFlagsContext =
  React.createContext<TrayStepFooterMotionFlags>({
    skipEntering: false,
    fullScreenBoundaryExit: false,
  });
