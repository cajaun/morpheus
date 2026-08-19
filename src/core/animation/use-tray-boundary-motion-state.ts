import { useLayoutEffect, useRef } from "react";
import {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { FULL_SCREEN_LAYOUT_DURATION } from "../constants";
import { withTrayTransitionStart } from "../transition-start";
import type { TrayTransitionContract } from "../../runtime/types";

type Params = {
  presentationFullScreen: boolean;
  renderedFullScreenBackgroundScale: number;
  renderedFullScreenSafeAreaTop: boolean;
  safeAreaTopInset: number;
  visibilityProgress: SharedValue<number>;
  morphProgress: SharedValue<number>;
  backgroundScale: SharedValue<number>;
  transitionStartedAt: SharedValue<number>;
  transitionStartedGeneration: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  transitionContract: TrayTransitionContract | null;
  onTransitionStart?: (
    startedAt: number,
    transitionGeneration: number,
  ) => void;
  onTransitionComplete?: (
    finishedAt: number,
    transitionGeneration: number,
  ) => void;
};

// Boundary motion is a geometry concern, not a second transition system.
// These values are all derived from the shell's rendered morph progress.
export const useTrayBoundaryMotionState = ({
  presentationFullScreen,
  renderedFullScreenBackgroundScale,
  renderedFullScreenSafeAreaTop,
  safeAreaTopInset,
  visibilityProgress,
  morphProgress,
  backgroundScale,
  transitionStartedAt,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  transitionContract,
  onTransitionStart,
  onTransitionComplete,
}: Params) => {
  const targetBackgroundScale = presentationFullScreen
    ? renderedFullScreenBackgroundScale
    : 1;
  const targetSafeAreaTop =
    presentationFullScreen && renderedFullScreenSafeAreaTop
      ? safeAreaTopInset
      : 0;

  const sourceBackgroundScale = useSharedValue(targetBackgroundScale);
  const destinationBackgroundScale = useSharedValue(targetBackgroundScale);
  const currentBackgroundScale = useSharedValue(targetBackgroundScale);
  const sourceSafeAreaTop = useSharedValue(targetSafeAreaTop);
  const destinationSafeAreaTop = useSharedValue(targetSafeAreaTop);
  const currentSafeAreaTop = useSharedValue(targetSafeAreaTop);
  const boundaryActive = useSharedValue(false);
  const morphStartedGeneration = useSharedValue(0);
  const surfaceFillOpacity = useSharedValue(
    presentationFullScreen ? 1 : 0,
  );
  const previousModeRef = useRef(presentationFullScreen);

  useLayoutEffect(() => {
    const modeChanged =
      previousModeRef.current !== presentationFullScreen;
    const hasBoundaryContract =
      transitionContract?.fullScreenChanged === true;
    const isBoundaryTransition = modeChanged && hasBoundaryContract;

    previousModeRef.current = presentationFullScreen;

    if (isBoundaryTransition) {
      // The shared current values are the last frame actually rendered by the
      // previous mode. They become the source of this generation.
      sourceBackgroundScale.value = currentBackgroundScale.value;
      destinationBackgroundScale.value = targetBackgroundScale;
      sourceSafeAreaTop.value = currentSafeAreaTop.value;
      destinationSafeAreaTop.value = targetSafeAreaTop;
      boundaryActive.value = true;
      morphStartedGeneration.value = 0;
      morphProgress.value = 0;

      if (!presentationFullScreen) {
        // Rounded sheet corners must reveal the app behind the surface before
        // the shell begins returning from the viewport.
        surfaceFillOpacity.value = 0;
      }

      return;
    }

    if (!hasBoundaryContract) {
      sourceBackgroundScale.value = targetBackgroundScale;
      destinationBackgroundScale.value = targetBackgroundScale;
      currentBackgroundScale.value = targetBackgroundScale;
      sourceSafeAreaTop.value = targetSafeAreaTop;
      destinationSafeAreaTop.value = targetSafeAreaTop;
      currentSafeAreaTop.value = targetSafeAreaTop;
      boundaryActive.value = false;
      surfaceFillOpacity.value = presentationFullScreen ? 1 : 0;
    }
  }, [
    boundaryActive,
    currentBackgroundScale,
    currentSafeAreaTop,
    destinationBackgroundScale,
    destinationSafeAreaTop,
    morphProgress,
    morphStartedGeneration,
    onTransitionComplete,
    onTransitionStart,
    presentationFullScreen,
    renderedFullScreenBackgroundScale,
    renderedFullScreenSafeAreaTop,
    safeAreaTopInset,
    sourceBackgroundScale,
    sourceSafeAreaTop,
    surfaceFillOpacity,
    targetBackgroundScale,
    targetSafeAreaTop,
    transitionCompletedGeneration,
    transitionContract?.fullScreenChanged,
    transitionContract?.generation,
    transitionLayoutStartedGeneration,
    transitionStartedAt,
    transitionStartedGeneration,
  ]);

  const transitionGeneration = transitionContract?.generation ?? 0;

  useAnimatedReaction(
    () => ({
      active: boundaryActive.value,
      startedGeneration: transitionStartedGeneration.value,
      completedGeneration: transitionCompletedGeneration.value,
    }),
    (state) => {
      // Incoming TrayStepContent establishes the shared clock. The shell then
      // joins that same clock, so a late entering worklet is not backdated and
      // rendered halfway through its opacity animation on the first frame.
      if (
        !state.active ||
        transitionGeneration <= 0 ||
        state.startedGeneration !== transitionGeneration ||
        state.completedGeneration >= transitionGeneration ||
        morphStartedGeneration.value === transitionGeneration
      ) {
        return;
      }

      morphStartedGeneration.value = transitionGeneration;
      morphProgress.value = withTrayTransitionStart(
        withTiming(
          1,
          {
            duration: FULL_SCREEN_LAYOUT_DURATION,
            easing: Easing.bezier(0, 0, 0.58, 1),
          },
          (finished) => {
            "worklet";

            if (finished && onTransitionComplete) {
              scheduleOnRN(
                onTransitionComplete,
                performance.now(),
                transitionGeneration,
              );
            }
          },
        ),
        transitionStartedGeneration,
        transitionStartedAt,
        transitionLayoutStartedGeneration,
        transitionCompletedGeneration,
        transitionGeneration,
        "layout",
        onTransitionStart,
      );
    },
    [
      boundaryActive,
      morphProgress,
      morphStartedGeneration,
      onTransitionComplete,
      onTransitionStart,
      transitionCompletedGeneration,
      transitionGeneration,
      transitionLayoutStartedGeneration,
      transitionStartedAt,
      transitionStartedGeneration,
    ],
  );

  useAnimatedReaction(
    () => ({
      active: boundaryActive.value,
      progress: morphProgress.value,
      sourceBackgroundScale: sourceBackgroundScale.value,
      destinationBackgroundScale: destinationBackgroundScale.value,
      sourceSafeAreaTop: sourceSafeAreaTop.value,
      destinationSafeAreaTop: destinationSafeAreaTop.value,
      visibility: visibilityProgress.value,
    }),
    (state) => {
      const progress = Math.min(1, Math.max(0, state.progress));

      if (state.active) {
        const nextBackgroundScale =
          state.sourceBackgroundScale +
          (state.destinationBackgroundScale -
            state.sourceBackgroundScale) *
            progress;
        const nextSafeAreaTop =
          state.sourceSafeAreaTop +
          (state.destinationSafeAreaTop - state.sourceSafeAreaTop) *
            progress;

        currentBackgroundScale.value = nextBackgroundScale;
        currentSafeAreaTop.value = nextSafeAreaTop;
        backgroundScale.value =
          1 + (nextBackgroundScale - 1) * state.visibility;

        if (progress >= 1) {
          boundaryActive.value = false;
          surfaceFillOpacity.value = presentationFullScreen ? 1 : 0;
        } else if (!presentationFullScreen) {
          surfaceFillOpacity.value = 0;
        }

        return;
      }

      currentBackgroundScale.value = state.destinationBackgroundScale;
      currentSafeAreaTop.value = state.destinationSafeAreaTop;
      backgroundScale.value =
        1 +
        (state.destinationBackgroundScale - 1) *
          state.visibility;
      surfaceFillOpacity.value = presentationFullScreen ? 1 : 0;
    },
    [
      backgroundScale,
      boundaryActive,
      currentBackgroundScale,
      currentSafeAreaTop,
      destinationBackgroundScale,
      destinationSafeAreaTop,
      morphProgress,
      presentationFullScreen,
      sourceBackgroundScale,
      sourceSafeAreaTop,
      surfaceFillOpacity,
      visibilityProgress,
    ],
  );

  const fullScreenSafeAreaContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: currentSafeAreaTop.value }],
  }));
  const fullScreenSurfaceFillStyle = useAnimatedStyle(() => ({
    opacity: surfaceFillOpacity.value,
  }));

  return {
    fullScreenSafeAreaContentStyle,
    fullScreenSurfaceFillStyle,
  };
};
