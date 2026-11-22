import {
  Easing,
  EntryExitAnimationFunction,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  FULL_SCREEN_CONTENT_EASING_POINTS,
  FULL_SCREEN_CONTENT_EXIT_EASING_POINTS,
  FULL_SCREEN_ENTERING_DURATION,
  FULL_SCREEN_EXITING_DURATION,
  MORPH_ENTERING_DURATION,
  SHEET_EASING_POINTS,
  MORPH_LAYOUT_DURATION,
} from "../core/constants";
import {
  type TrayTransitionStart,
  type TrayTransitionStartSignal,
  resolveTrayTransitionFullScreenChanged,
  resolveTrayTransitionGeneration,
  shouldWaitForTrayLayoutStart,
  withTrayTransitionStart,
} from "../core/transition-start";
import {
  FORWARD_CONTENT_MOTION,
  resolveMorphEnteringScale,
  resolveMorphExitingScale,
  resolveActiveFullScreenBoundaryExit,
  type TrayContentMotionDirection,
} from "../core/transition-motion-direction";
import {
  TRAY_INSTRUMENTATION_ENABLED,
  isTrayInstrumentationEnabled,
} from "../telemetry/config";
import { recordTrayTelemetry } from "../telemetry/tray-telemetry-buffer";
import { markTrayStepContentReleased } from "../telemetry/tray-step-timing";

export const MORPH_EASING = Easing.bezier(0.25, 1.0, 0.5, 1);

export const SHEET_EASING = Easing.bezier(...SHEET_EASING_POINTS);

export const FULL_SCREEN_CONTENT_EASING = Easing.bezier(
  ...FULL_SCREEN_CONTENT_EASING_POINTS,
);

export const FULL_SCREEN_CONTENT_EXIT_EASING = Easing.bezier(
  ...FULL_SCREEN_CONTENT_EXIT_EASING_POINTS,
);

// record the end of an entering animation for timing inspection
export const logStepEnterFinished = (stepKey: string, finishedAt: number) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  recordTrayTelemetry("step-enter-finished", {
    stepKey,
    finishedAt: Number(finishedAt.toFixed(2)),
  });
};

// record when incoming content releases its latch, joinDelayMs measures on the UI thread how late it joined the clock
export const logStepEnterStarted = (stepKey: string, joinDelayMs: number) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  markTrayStepContentReleased(stepKey);

  recordTrayTelemetry("step-enter-started", {
    stepKey,
    startedAt: Number(performance.now().toFixed(2)),
    joinDelayMs: Number(joinDelayMs.toFixed(2)),
  });
};

// incoming animations on the shared clock for mounted and revealed preloaded content alike
export const buildMorphEnteringAnimations = (
  scale: boolean,
  stepKey: string,
  transitionStart: TrayTransitionStart | null,
  motionDirection: TrayContentMotionDirection | null,
  onOpacityFinished?: (finished?: boolean) => void,
) => {
  "worklet";

  const synchronizedFullScreen =
    resolveTrayTransitionFullScreenChanged(transitionStart);
  const transitionGeneration = resolveTrayTransitionGeneration(transitionStart);
  const waitForLayoutStart = shouldWaitForTrayLayoutStart(
    transitionStart,
    transitionGeneration,
  );
  const duration = synchronizedFullScreen
    ? FULL_SCREEN_ENTERING_DURATION
    : MORPH_ENTERING_DURATION;
  const easing = synchronizedFullScreen
    ? FULL_SCREEN_CONTENT_EASING
    : MORPH_EASING;
  const direction = motionDirection ?? FORWARD_CONTENT_MOTION;
  const initialScale = resolveMorphEnteringScale({
    scale,
    synchronizedFullScreen,
    direction,
  });
  const synchronizeWithTransition = (
    animation: number,
    onStart?: TrayTransitionStartSignal,
  ) => {
    "worklet";

    if (transitionStart === null || transitionGeneration <= 0) {
      return animation;
    }

    return withTrayTransitionStart(
      animation,
      transitionStart.startedGeneration,
      transitionStart.startedAt,
      transitionStart.layoutStartedGeneration,
      transitionStart.completedGeneration,
      transitionGeneration,
      "incoming",
      onStart,
      synchronizedFullScreen,
      waitForLayoutStart,
    );
  };
  const synchronizeWithLayout = (animation: number, logRelease = false) => {
    "worklet";

    const synchronizedAnimation = synchronizeWithTransition(
      animation,
      logRelease && __DEV__ && TRAY_INSTRUMENTATION_ENABLED
        ? (clockStartedAt: number, _generation: number, joinedAt: number) => {
            "worklet";
            scheduleOnRN(
              logStepEnterStarted,
              stepKey,
              Math.max(0, joinedAt - clockStartedAt),
            );
          }
        : undefined,
    );

    return synchronizedAnimation;
  };

  return {
    initialScale,
    opacity: synchronizeWithLayout(
      withTiming(
        1,
        {
          duration,
          easing,
        },
        onOpacityFinished,
      ),
      true,
    ),
    scale: synchronizeWithLayout(
      withTiming(1, {
        duration,
        easing,
      }),
    ),
    translateY: synchronizeWithLayout(
      withTiming(0, {
        duration,
        easing,
      }),
    ),
  };
};

export const logEnterFinishedWorklet = (
  stepKey: string,
  finished?: boolean,
) => {
  "worklet";

  if (finished && __DEV__ && TRAY_INSTRUMENTATION_ENABLED) {
    scheduleOnRN(logStepEnterFinished, stepKey, performance.now());
  }
};

// entering animation on the shared transition clock
export const createMorphEntering = (
  scale: boolean,
  stepKey: string,
  transitionStart: TrayTransitionStart | null,
  motionDirection: TrayContentMotionDirection | null,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    const animations = buildMorphEnteringAnimations(
      scale,
      stepKey,
      transitionStart,
      motionDirection,
    );

    return {
      initialValues: {
        opacity: 0,
        transform: [{ scale: animations.initialScale }, { translateY: 0 }],
      },
      animations: {
        opacity: animations.opacity,
        transform: [
          { scale: animations.scale },
          { translateY: animations.translateY },
        ],
      },
      callback: (finished: boolean) => {
        logEnterFinishedWorklet(stepKey, finished);
      },
    };
  };
};

// exiting animation on the shared transition clock
export const createMorphExiting = (
  scale: boolean,
  fullScreenBoundaryExit: boolean,
  transitionStart: TrayTransitionStart | null,
  motionDirection: TrayContentMotionDirection | null,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";
    const synchronizedFullScreen =
      resolveTrayTransitionFullScreenChanged(transitionStart);
    const transitionGeneration =
      resolveTrayTransitionGeneration(transitionStart);
    const waitForLayoutStart = shouldWaitForTrayLayoutStart(
      transitionStart,
      transitionGeneration,
    );
    const activeFullScreenBoundaryExit = resolveActiveFullScreenBoundaryExit(
      fullScreenBoundaryExit,
      synchronizedFullScreen,
    );
    // sheet steps fade with the sheet layout's duration and curve on the same clock
    const duration = activeFullScreenBoundaryExit
      ? FULL_SCREEN_EXITING_DURATION
      : MORPH_LAYOUT_DURATION;
    const easing = activeFullScreenBoundaryExit
      ? FULL_SCREEN_CONTENT_EXIT_EASING
      : SHEET_EASING;
    const direction = motionDirection ?? FORWARD_CONTENT_MOTION;
    const targetScale = resolveMorphExitingScale({
      scale,
      fullScreenBoundaryExit: activeFullScreenBoundaryExit,
      direction,
    });
    const synchronizeWithTransition = (animation: number) => {
      "worklet";

      if (transitionStart === null || transitionGeneration <= 0) {
        return animation;
      }

      return withTrayTransitionStart(
        animation,
        transitionStart.startedGeneration,
        transitionStart.startedAt,
        transitionStart.layoutStartedGeneration,
        transitionStart.completedGeneration,
        transitionGeneration,
        "outgoing",
        undefined,
        synchronizedFullScreen,
        waitForLayoutStart,
      );
    };

    return {
      initialValues: {
        opacity: 1,
        transform: [{ scale: 1 }, { translateY: 0 }],
      },
      animations: {
        // fullscreen boundary exits fade without scaling so header alignment holds
        opacity: synchronizeWithTransition(
          withTiming(0, {
            duration,
            easing,
          }),
        ),

        transform: [
          {
            scale: synchronizeWithTransition(
              withTiming(targetScale, {
                duration,
                easing,
              }),
            ),
          },

          {
            translateY: synchronizeWithTransition(
              withTiming(0, {
                duration,
                easing,
              }),
            ),
          },
        ],
      },
    };
  };
};
