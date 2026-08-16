import React, { useEffect } from "react";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  FULL_SCREEN_CONTENT_EASING_POINTS,
  FULL_SCREEN_ENTERING_DURATION,
  FULL_SCREEN_EXITING_DURATION,
  MORPH_ENTERING_DURATION,
  MORPH_EXITING_DURATION,
} from "./core/constants";
import {
  type FullScreenTransitionStart,
  shouldAwaitFullScreenLayoutStart,
  useFullScreenTransitionStart,
  withFullScreenLayoutStart,
} from "./core/full-screen-transition-start";
import {
  type TrayTransitionStart,
  useTrayTransitionStart,
  withTrayTransitionStart,
} from "./core/transition-start";
import { log } from "./core/logger";
import {
  FORWARD_CONTENT_MOTION,
  resolveMorphEnteringScale,
  resolveMorphExitingScale,
  type TrayContentMotionDirection,
  useTrayContentMotionDirection,
} from "./core/transition-motion-direction";
import {
  ACTION_TRAY_INSTRUMENTATION_ENABLED,
  isActionTrayInstrumentationEnabled,
} from "./telemetry/config";
import { markTrayStepContentReleased } from "./telemetry/tray-step-timing";

// content transitions live here so every step swap shares the same motion language
type Props = {
  children: React.ReactNode;
  scale?: boolean;
  anchorScaleToTop?: boolean;
  fullScreenBoundaryExit?: boolean;
  stepKey?: string;
  skipEntering?: boolean;
  skipExiting?: boolean;
};

export const MORPH_EASING = Easing.bezier(0.25, 1.0, 0.5, 1);
export const SHEET_EASING = Easing.bezier(0.34, 1.12, 0.64, 1);
export const FULL_SCREEN_CONTENT_EASING = Easing.bezier(
  ...FULL_SCREEN_CONTENT_EASING_POINTS,
);

const logStepEnterFinished = (stepKey: string, finishedAt: number) => {
  if (!isActionTrayInstrumentationEnabled()) {
    return;
  }

  console.log("[step-enter-finished]", {
    stepKey,
    finishedAt: Number(finishedAt.toFixed(2)),
  });
};

const logStepEnterStarted = (stepKey: string, startedAt: number) => {
  if (!isActionTrayInstrumentationEnabled()) {
    return;
  }

  markTrayStepContentReleased(stepKey, startedAt);

  console.log("[step-enter-started]", {
    stepKey,
    startedAt: Number(startedAt.toFixed(2)),
  });
};

const createMorphEntering = (
  scale: boolean,
  stepKey: string,
  fullScreenTransition: FullScreenTransitionStart | null,
  transitionStart: TrayTransitionStart | null,
  motionDirection: { value: TrayContentMotionDirection } | null,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    const shouldAwaitLayout = shouldAwaitFullScreenLayoutStart(
      fullScreenTransition,
    );
    const duration = shouldAwaitLayout
      ? FULL_SCREEN_ENTERING_DURATION
      : MORPH_ENTERING_DURATION;
    const easing = shouldAwaitLayout
      ? FULL_SCREEN_CONTENT_EASING
      : MORPH_EASING;
    const direction =
      motionDirection?.value ?? FORWARD_CONTENT_MOTION;
    const initialScale = resolveMorphEnteringScale({
      scale,
      synchronizedFullScreen: shouldAwaitLayout,
      direction,
    });
    const synchronizeWithTransition = (
      animation: number,
      onStart?: (startedAt: number) => void,
    ) => {
      "worklet";

      if (
        transitionStart === null ||
        transitionStart.generation <= 0
      ) {
        return animation;
      }

      return withTrayTransitionStart(
        animation,
        transitionStart.startedGeneration,
        transitionStart.startedAt,
        transitionStart.layoutStartedGeneration,
        transitionStart.completedGeneration,
        transitionStart.generation,
        "incoming",
        onStart,
      );
    };
    const synchronizeWithLayout = (
      animation: number,
      logRelease = false,
    ) => {
      "worklet";

      const synchronizedAnimation = synchronizeWithTransition(
        animation,
        !shouldAwaitLayout &&
          logRelease &&
          __DEV__ &&
          ACTION_TRAY_INSTRUMENTATION_ENABLED
          ? (startedAt: number) => {
              "worklet";
              scheduleOnRN(logStepEnterStarted, stepKey, startedAt);
            }
          : undefined,
      );

      if (!shouldAwaitLayout || fullScreenTransition === null) {
        return synchronizedAnimation;
      }

      // fullscreen enters hold until shell layout publishes the matching generation
      return withFullScreenLayoutStart(
        synchronizedAnimation,
        fullScreenTransition.startedGeneration,
        fullScreenTransition.startedAt,
        fullScreenTransition.generation,
        logRelease &&
          __DEV__ &&
          ACTION_TRAY_INSTRUMENTATION_ENABLED
          ? logStepEnterStarted
          : undefined,
        stepKey,
      );
    };

    return {
      initialValues: {
        opacity: 0,
        transform: [
          { scale: initialScale },
          { translateY: 0 },
        ],
      },
      animations: {
        opacity: synchronizeWithLayout(
          withTiming(1, {
            duration,
            easing,
          }),
          true,
        ),
        transform: [
          {
            scale: synchronizeWithLayout(
              withTiming(1, {
                duration,
                easing,
              }),
            ),
          },
          {
            translateY: synchronizeWithLayout(
              withTiming(0, {
                duration,
                easing,
              }),
            ),
          },
        ],
      },
      callback: (finished: boolean) => {
        if (
          finished &&
          __DEV__ &&
          ACTION_TRAY_INSTRUMENTATION_ENABLED
        ) {
          scheduleOnRN(logStepEnterFinished, stepKey, performance.now());
        }
      },
    };
  };
};

const createMorphExiting = (
  scale: boolean,
  fullScreenBoundaryExit: boolean,
  transitionStart: TrayTransitionStart | null,
  motionDirection: { value: TrayContentMotionDirection } | null,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";
    const duration = fullScreenBoundaryExit
      ? FULL_SCREEN_EXITING_DURATION
      : MORPH_EXITING_DURATION;
    const easing = fullScreenBoundaryExit
      ? FULL_SCREEN_CONTENT_EASING
      : SHEET_EASING;
    const direction =
      motionDirection?.value ?? FORWARD_CONTENT_MOTION;
    const targetScale = resolveMorphExitingScale({
      scale,
      fullScreenBoundaryExit,
      direction,
    });
    const synchronizeWithTransition = (animation: number) => {
      "worklet";

      if (
        transitionStart === null ||
        transitionStart.fullScreenChanged ||
        transitionStart.generation <= 0
      ) {
        return animation;
      }

      return withTrayTransitionStart(
        animation,
        transitionStart.startedGeneration,
        transitionStart.startedAt,
        transitionStart.layoutStartedGeneration,
        transitionStart.completedGeneration,
        transitionStart.generation,
        "outgoing",
      );
    };

    return {
      initialValues: {
        opacity: 1,
        transform: [{ scale: 1 }, { translateY: 0 }],
      },
      animations: {
        // fullscreen boundary exits fade without scaling so header alignment stays fixed
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

export const TrayStepContent: React.FC<Props> = ({
  children,
  scale = true,
  anchorScaleToTop = false,
  fullScreenBoundaryExit = false,
  stepKey,
  skipEntering = false,
  skipExiting = false,
}) => {
  const fullScreenTransition = useFullScreenTransitionStart();
  const transitionStart = useTrayTransitionStart();
  const motionDirection = useTrayContentMotionDirection();

  useEffect(() => {
    log("TrayStepContent", {
      stepKey,
      skipEntering,
      skipExiting,
    });
  }, [skipEntering, skipExiting, stepKey]);

  return (
    <Animated.View
      key={stepKey}
      // scale fullscreen layers from the body boundary so they stay below the header
      style={
        anchorScaleToTop
          ? { transformOrigin: ["50%", "0%", 0] }
          : undefined
      }
      // first render can skip enter because shell open already provides the arrival cue
      entering={
        skipEntering
          ? undefined
          : createMorphEntering(
              scale,
              stepKey ?? "unknown-step",
              fullScreenTransition,
              transitionStart,
              motionDirection,
            )
      }
      exiting={
        skipExiting
          ? undefined
          : createMorphExiting(
              scale,
              fullScreenBoundaryExit,
              transitionStart,
              motionDirection,
            )
      }
    >
      {children}
    </Animated.View>
  );
};
