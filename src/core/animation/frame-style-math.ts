import { interpolate } from "react-native-reanimated";
import {
  BORDER_RADIUS,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../constants";

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

export const resolveBoundaryShellStyle = ({
  progress,
  sourceFullScreen,
  targetFullScreen,
  sourceHeight,
  targetHeight,
  bottom,
  bottomInset,
}: {
  progress: number;
  sourceFullScreen: boolean;
  targetFullScreen: boolean;
  sourceHeight: number;
  targetHeight: number;
  bottom: number;
  bottomInset: number;
}) => {
  "worklet";

  const sourceBottom = sourceFullScreen ? 0 : bottom + bottomInset;
  const targetBottom = targetFullScreen ? 0 : bottom + bottomInset;
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
