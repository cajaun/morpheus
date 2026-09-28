import { interpolate } from "react-native-reanimated";
import {
  BORDER_RADIUS,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../constants";

// hold boundary progress at the correct lifecycle phase
export const resolveBoundaryProgress = (
  progress: number,
  transitionGeneration: number | undefined,
  transitionStartedGeneration: number | undefined,
  transitionLayoutStartedGeneration: number | undefined,
  transitionCompletedGeneration: number | undefined,
  fullScreenBoundaryTransition: boolean,
) => {
  "worklet";

  if (
    !fullScreenBoundaryTransition ||
    transitionGeneration === undefined ||
    transitionGeneration <= 0
  ) {
    return progress;
  }

  if ((transitionCompletedGeneration ?? 0) >= transitionGeneration) {
    return 1;
  }

  if ((transitionStartedGeneration ?? 0) < transitionGeneration) {
    return 0;
  }

  return progress;
};

// check whether a boundary transition can read its shared clock
export const isBoundaryClockStarted = (
  transitionGeneration: number | undefined,
  transitionStartedGeneration: number | undefined,
  transitionCompletedGeneration: number | undefined,
) => {
  "worklet";

  if (transitionGeneration === undefined || transitionGeneration <= 0) {
    return true;
  }

  return (
    (transitionStartedGeneration ?? 0) >= transitionGeneration ||
    (transitionCompletedGeneration ?? 0) >= transitionGeneration
  );
};

// keep a sheet target in measurement mode until its frame is ready
export const isTargetSheetMeasurementPending = ({
  fullScreenBoundaryTransition,
  sourceFullScreen,
  targetFullScreen,
  transitionGeneration,
  transitionCompletedGeneration,
  hasPreparedSheetFrame,
}: {
  fullScreenBoundaryTransition: boolean;
  sourceFullScreen: boolean;
  targetFullScreen: boolean;
  transitionGeneration: number | undefined;
  transitionCompletedGeneration: number | undefined;
  hasPreparedSheetFrame: boolean;
}) => {
  "worklet";

  return (
    fullScreenBoundaryTransition &&
    transitionGeneration !== undefined &&
    transitionGeneration > 0 &&
    sourceFullScreen &&
    !targetFullScreen &&
    (transitionCompletedGeneration ?? 0) < transitionGeneration &&
    !hasPreparedSheetFrame
  );
};

// derive shell bounds from the source and target presentation modes
export const resolveBoundaryShellStyle = ({
  progress,
  sourceFullScreen,
  targetFullScreen,
  sourceHeight,
  targetHeight,
  bottomInset,
}: {
  progress: number;
  sourceFullScreen: boolean;
  targetFullScreen: boolean;
  sourceHeight: number;
  targetHeight: number;
  bottomInset: number;
}) => {
  "worklet";

  const sourceBottom = sourceFullScreen ? 0 : HORIZONTAL_MARGIN + bottomInset;
  const targetBottom = targetFullScreen ? 0 : HORIZONTAL_MARGIN + bottomInset;
  const sourceLeft = sourceFullScreen ? 0 : HORIZONTAL_MARGIN;
  const targetLeft = targetFullScreen ? 0 : HORIZONTAL_MARGIN;
  const sourceTop = sourceFullScreen
    ? 0
    : SCREEN_HEIGHT - sourceBottom - sourceHeight;
  const targetTop = targetFullScreen
    ? 0
    : SCREEN_HEIGHT - targetBottom - targetHeight;

  return {
    left: interpolate(progress, [0, 1], [sourceLeft, targetLeft]),
    width: interpolate(
      progress,
      [0, 1],
      [SCREEN_WIDTH - sourceLeft * 2, SCREEN_WIDTH - targetLeft * 2],
    ),
    top: interpolate(progress, [0, 1], [sourceTop, targetTop]),
    height: interpolate(progress, [0, 1], [sourceHeight, targetHeight]),
    bottom: "auto" as const,
    right: "auto" as const,
    borderRadius: BORDER_RADIUS,
  };
};

// derive the content viewport from the same boundary phase as the shell
export const resolveBoundaryContentStyle = ({
  progress,
  boundaryClockStarted,
  sourceFullScreen,
  targetFullScreen,
  sourceHeight,
  targetHeight,
}: {
  progress: number;
  boundaryClockStarted: boolean;
  sourceFullScreen: boolean;
  targetFullScreen: boolean;
  sourceHeight: number;
  targetHeight: number;
}) => {
  "worklet";

  const contentFullScreen = boundaryClockStarted
    ? targetFullScreen
    : sourceFullScreen;
  const contentWidth = contentFullScreen
    ? SCREEN_WIDTH
    : SCREEN_WIDTH - HORIZONTAL_MARGIN * 2;

  return {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    left: 0,
    width: contentWidth,
    height: interpolate(
      progress,
      [0, 1],
      [sourceHeight, targetHeight],
    ),
    alignSelf: "flex-start" as const,
  };
};

// choose intrinsic or fullscreen content sizing during a boundary change
export const resolveBoundaryContentViewportStyle = ({
  boundaryClockStarted,
  fullScreenBoundaryTransition,
  sourceFullScreen,
  targetFullScreen,
  sourceContentHeight,
  targetSheetMeasurementPending = false,
}: {
  boundaryClockStarted: boolean;
  fullScreenBoundaryTransition: boolean;
  sourceFullScreen: boolean;
  targetFullScreen: boolean;
  sourceContentHeight?: number;
  targetSheetMeasurementPending?: boolean;
}) => {
  "worklet";

  if (!fullScreenBoundaryTransition) {
    return targetFullScreen ? { flex: 1 } : {};
  }

  // hold the shell on its source frame until the target sheet is measured
  if (targetSheetMeasurementPending) {
    return {
      flex: 0,
      height: undefined,
    };
  }

  // keep content viewport phase aligned with shell boundary phase
  const contentFullScreen = boundaryClockStarted
    ? targetFullScreen
    : sourceFullScreen;

  if (contentFullScreen) {
    return {
      flex: 1,
      height: undefined,
    };
  }

  if (!boundaryClockStarted && sourceContentHeight !== undefined) {
    return {
      flex: 0,
      height: sourceContentHeight,
    };
  }

  return {};
};

// preserve the source viewport while the target sheet waits for measurement
export const resolveBoundaryContentSourceViewportStyle = ({
  fullScreenBoundaryTransition,
  sourceFullScreen,
  sourceContentHeight,
}: {
  fullScreenBoundaryTransition: boolean;
  sourceFullScreen: boolean;
  sourceContentHeight?: number;
}) => {
  "worklet";

  if (
    !fullScreenBoundaryTransition ||
    sourceFullScreen ||
    sourceContentHeight === undefined
  ) {
    return undefined;
  }

  // preserve a minimum until the animated style publishes its boundary phase
  return {
    minHeight: sourceContentHeight,
  };
};

// derive header padding from the active boundary progress
export const resolveBoundaryHeaderPadding = ({
  progress,
  sourceFullScreen,
  targetFullScreen,
  fullScreenHeaderBottomGap,
}: {
  progress: number;
  sourceFullScreen: boolean;
  targetFullScreen: boolean;
  fullScreenHeaderBottomGap: number;
}) => {
  "worklet";

  return interpolate(
    progress,
    [0, 1],
    [
      sourceFullScreen ? fullScreenHeaderBottomGap : 0,
      targetFullScreen ? fullScreenHeaderBottomGap : 0,
    ],
  );
};
