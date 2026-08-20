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
  type TrayTransitionStart,
  resolveTrayTransitionFullScreenChanged,
  resolveTrayTransitionGeneration,
  useTrayTransitionStart,
  withTrayTransitionStart,
} from "./core/transition-start";
import { log } from "./core/logger";
import {
  FORWARD_CONTENT_MOTION,
  resolveMorphEnteringScale,
  resolveMorphExitingScale,
  resolveActiveFullScreenBoundaryExit,
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
  transitionStart: TrayTransitionStart | null,
  motionDirection: { value: TrayContentMotionDirection } | null,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    const synchronizedFullScreen =
      resolveTrayTransitionFullScreenChanged(transitionStart);
    const transitionGeneration =
      resolveTrayTransitionGeneration(transitionStart);
    const duration = synchronizedFullScreen
      ? FULL_SCREEN_ENTERING_DURATION
      : MORPH_ENTERING_DURATION;
    const easing = synchronizedFullScreen
      ? FULL_SCREEN_CONTENT_EASING
      : MORPH_EASING;
    const direction =
      motionDirection?.value ?? FORWARD_CONTENT_MOTION;
    const initialScale = resolveMorphEnteringScale({
      scale,
      synchronizedFullScreen,
      direction,
    });
    const synchronizeWithTransition = (
      animation: number,
      onStart?: (startedAt: number) => void,
    ) => {
      "worklet";

      if (
        transitionStart === null ||
        transitionGeneration <= 0
      ) {
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
      );
    };
    const synchronizeWithLayout = (
      animation: number,
      logRelease = false,
    ) => {
      "worklet";

      const synchronizedAnimation = synchronizeWithTransition(
        animation,
        logRelease &&
          __DEV__ &&
          ACTION_TRAY_INSTRUMENTATION_ENABLED
          ? (startedAt: number) => {
              "worklet";
              scheduleOnRN(logStepEnterStarted, stepKey, startedAt);
            }
          : undefined,
      );

      return synchronizedAnimation;
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
    const synchronizedFullScreen =
      resolveTrayTransitionFullScreenChanged(transitionStart);
    const transitionGeneration =
      resolveTrayTransitionGeneration(transitionStart);
    const activeFullScreenBoundaryExit =
      resolveActiveFullScreenBoundaryExit(
        fullScreenBoundaryExit,
        synchronizedFullScreen,
      );
    const duration = activeFullScreenBoundaryExit
      ? FULL_SCREEN_EXITING_DURATION
      : MORPH_EXITING_DURATION;
    const easing = activeFullScreenBoundaryExit
      ? FULL_SCREEN_CONTENT_EASING
      : SHEET_EASING;
    const direction =
      motionDirection?.value ?? FORWARD_CONTENT_MOTION;
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
          ? {
              // the parent content frame owns boundary geometry this layer only establishes the fullscreen viewport required by tray pages
              flex: 1,
              transformOrigin: ["50%", "0%", 0],
            }
          : undefined
      }
      // first render can skip enter because shell open already provides the arrival cue
      entering={
        skipEntering
          ? undefined
          : createMorphEntering(
              scale,
              stepKey ?? "unknown-step",
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
