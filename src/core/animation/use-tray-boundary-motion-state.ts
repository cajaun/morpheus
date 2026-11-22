import { useRef } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  runOnUI,
  type SharedValue,
} from "react-native-reanimated";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";
import { isTrayDebugLoggingEnabled, log, logWorklet } from "../logger";
import type { TrayTransitionContract } from "../../runtime/types";
import { useBoundaryClockStart } from "./use-boundary-clock-start";

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
  boundaryGeometryReady?: boolean;
  // generation of the mounted step content, see tray-content-commit
  contentCommittedGeneration?: SharedValue<number>;
  onTransitionStart?: (
    startedAt: number,
    transitionGeneration: number,
  ) => void;
  onTransitionComplete?: (
    finishedAt: number,
    transitionGeneration: number,
  ) => void;
};

// fullscreen-to-sheet step changes wait for the target content commit because their height is known a commit early, other changes would wait forever
export const shouldBoundaryWaitForContentCommit = (
  contract: TrayTransitionContract | null | undefined,
) =>
  contract?.fullScreenChanged === true &&
  contract.stepChanged === true &&
  contract.to?.mode === "sheet";

// boundary geometry derives from shell morph progress instead of a second transition system
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
  boundaryGeometryReady = true,
  contentCommittedGeneration,
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
  const didInitializeBoundaryRef = useRef(false);

  useProfiledTrayLayoutEffect("useTrayBoundaryMotionState.transitionBoundary", () => {
    const isInitialCommit = !didInitializeBoundaryRef.current;
    didInitializeBoundaryRef.current = true;
    const modeChanged =
      previousModeRef.current !== presentationFullScreen;
    const hasBoundaryContract =
      transitionContract?.fullScreenChanged === true;
    const isBoundaryTransition = modeChanged && hasBoundaryContract;

    const waitingForSheetGeometry =
      isBoundaryTransition &&
      transitionContract?.to?.mode === "sheet" &&
      !boundaryGeometryReady;

    if (waitingForSheetGeometry) {
      // the previous mode stays latched until the target sheet owns a valid frame, which keeps the clock start contract
      if (isTrayDebugLoggingEnabled()) {
        log("BOUNDARY CONFIG WAITING FOR SHEET GEOMETRY", {
          boundaryGeometryReady,
          transition: describeTrayTransition(transitionContract),
        });
      }
      return;
    }

    previousModeRef.current = presentationFullScreen;

    if (isTrayDebugLoggingEnabled()) {
      log("BOUNDARY CONFIG", {
        modeChanged,
        hasBoundaryContract,
        boundaryActive: boundaryActive.value,
        currentBackgroundScale: currentBackgroundScale.value,
        morphProgress: morphProgress.value,
        transitionStartedAt: transitionStartedAt.value,
        transitionStartedGeneration: transitionStartedGeneration.value,
        transitionLayoutStartedGeneration:
          transitionLayoutStartedGeneration.value,
        transitionCompletedGeneration: transitionCompletedGeneration.value,
        presentationFullScreen,
        targetBackgroundScale,
        targetSafeAreaTop,
        transition: describeTrayTransition(transitionContract),
      });
    }

    if (isBoundaryTransition) {
      // capture the live source frame and publish the boundary setup together on the UI runtime, a JS read can block on an in-flight boundary reaction
      runOnUI(
        (
          nextBackgroundScale: number,
          nextSafeAreaTop: number,
          enteringFullScreen: boolean,
        ) => {
          "worklet";

          sourceBackgroundScale.value = currentBackgroundScale.value;
          destinationBackgroundScale.value = nextBackgroundScale;
          sourceSafeAreaTop.value = currentSafeAreaTop.value;
          destinationSafeAreaTop.value = nextSafeAreaTop;
          boundaryActive.value = true;
          morphStartedGeneration.value = 0;
          morphProgress.value = 0;

          if (!enteringFullScreen) {
            // rounded sheet corners reveal the app behind the surface before the shell leaves the viewport
            surfaceFillOpacity.value = 0;
          }
        },
      )(targetBackgroundScale, targetSafeAreaTop, presentationFullScreen);

      return;
    }

    if (!hasBoundaryContract) {
      // useSharedValue already holds these values on the first commit, so skip the UI-thread writes
      if (isInitialCommit && !modeChanged) {
        return;
      }

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
    transitionContract,
    transitionContract?.fullScreenChanged,
    transitionContract?.generation,
    boundaryGeometryReady,
    transitionLayoutStartedGeneration,
    transitionStartedAt,
    transitionStartedGeneration,
  ]);

  const transitionGeneration = transitionContract?.generation ?? 0;
  // a returning sheet can know its height a commit before its content mounts, so the clock waits for this generation's content commit
  const entersFullScreen =
    transitionContract?.fullScreenChanged === true &&
    transitionContract.to?.mode === "fullScreen";
  const waitForContentCommit =
    contentCommittedGeneration !== undefined &&
    shouldBoundaryWaitForContentCommit(transitionContract);

  useBoundaryClockStart({
    boundaryActive,
    morphStartedGeneration,
    morphProgress,
    transitionStartedGeneration,
    transitionStartedAt,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
    contentCommittedGeneration,
    waitForContentCommit,
    transitionGeneration,
    entersFullScreen,
    onTransitionStart,
    onTransitionComplete,
  });

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
    (state, previous) => {
      const progress = Math.min(1, Math.max(0, state.progress));

      if (
        state.active &&
        progress >= 1 &&
        (!previous || previous.progress < 1)
      ) {
        logWorklet("BOUNDARY CLOCK REACHED END", {
          generation: transitionGeneration,
          progress,
          presentationFullScreen,
          transitionStartedAt: transitionStartedAt.value,
          transitionStartedGeneration: transitionStartedGeneration.value,
          transitionLayoutStartedGeneration:
            transitionLayoutStartedGeneration.value,
          transitionCompletedGeneration: transitionCompletedGeneration.value,
        });
      }

      if (previous?.active && !state.active) {
        logWorklet("BOUNDARY CLOCK INACTIVE", {
          generation: transitionGeneration,
          progress,
          presentationFullScreen,
          transitionStartedAt: transitionStartedAt.value,
          transitionStartedGeneration: transitionStartedGeneration.value,
          transitionLayoutStartedGeneration:
            transitionLayoutStartedGeneration.value,
          transitionCompletedGeneration: transitionCompletedGeneration.value,
        });
      }

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

        currentSafeAreaTop.value = nextSafeAreaTop;
        currentBackgroundScale.value = nextBackgroundScale;
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

      currentSafeAreaTop.value = state.destinationSafeAreaTop;
      currentBackgroundScale.value = state.destinationBackgroundScale;
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
