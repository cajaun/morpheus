import React, { useEffect } from "react";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import { MORPH_DURATION } from "./core/constants";
import {
  type FullScreenTransitionStart,
  shouldAwaitFullScreenLayoutStart,
  useFullScreenTransitionStart,
  withFullScreenLayoutStart,
} from "./core/full-screen-transition-start";
import { log } from "./core/logger";

// content transitions live here so every step swap shares the same motion language
type Props = {
  children: React.ReactNode;
  scale?: boolean;
  stepKey?: string;
  skipEntering?: boolean;
  skipExiting?: boolean;
};

export const MORPH_EASING = Easing.bezier(0.25, 1.0, 0.5, 1);
export const SHEET_EASING = Easing.bezier(0.34, 1.12, 0.64, 1);

const logStepEnterFinished = (stepKey: string, finishedAt: number) => {
  if (!__DEV__) {
    return;
  }

  console.log("[step-enter-finished]", {
    stepKey,
    finishedAt: Number(finishedAt.toFixed(2)),
  });
};

const logStepEnterStarted = (stepKey: string, startedAt: number) => {
  if (!__DEV__) {
    return;
  }

  console.log("[step-enter-started]", {
    stepKey,
    startedAt: Number(startedAt.toFixed(2)),
  });
};

const createMorphEntering = (
  scale: boolean,
  stepKey: string,
  fullScreenTransition: FullScreenTransitionStart | null,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    const shouldAwaitLayout = shouldAwaitFullScreenLayoutStart(
      fullScreenTransition,
    );
    const synchronizeWithLayout = (
      animation: number,
      logRelease = false,
    ) => {
      "worklet";

      if (!shouldAwaitLayout || fullScreenTransition === null) {
        return animation;
      }

      return withFullScreenLayoutStart(
        animation,
        fullScreenTransition.startedGeneration,
        fullScreenTransition.startedAt,
        fullScreenTransition.generation,
        logRelease && __DEV__ ? logStepEnterStarted : undefined,
        stepKey,
      );
    };

    if (__DEV__ && !shouldAwaitLayout) {
      runOnJS(logStepEnterStarted)(stepKey, performance.now());
    }

    return {
      initialValues: {
        opacity: 0,
        transform: [{ scale: scale ? 1.05 : 1 }, { translateY: 0 }],
      },
      animations: {
        opacity: synchronizeWithLayout(
          withTiming(1, {
            duration: MORPH_DURATION,
            easing: MORPH_EASING,
          }),
          true,
        ),
        transform: [
          {
            scale: synchronizeWithLayout(
              withTiming(1, {
                duration: MORPH_DURATION,
                easing: MORPH_EASING,
              }),
            ),
          },
          {
            translateY: synchronizeWithLayout(
              withTiming(0, {
                duration: MORPH_DURATION,
                easing: MORPH_EASING,
              }),
            ),
          },
        ],
      },
      callback: (finished: boolean) => {
        if (finished) {
          runOnJS(logStepEnterFinished)(stepKey, performance.now());
        }
      },
    };
  };
};

const createMorphExiting = (scale: boolean): EntryExitAnimationFunction => {
  return () => {
    "worklet";
    return {
      initialValues: {
        opacity: 1,
        transform: [{ scale: 1 }, { translateY: 0 }],
      },
      animations: {
        opacity: withTiming(0, { duration: MORPH_DURATION, easing: MORPH_EASING }),
    
        transform: [
          { scale: withTiming(scale ? 0.98 : 1, { duration: MORPH_DURATION, easing: MORPH_EASING }) },
        
          { translateY: withTiming(0, { duration: MORPH_DURATION, easing: MORPH_EASING }) },
        ],
      },
    };
  };
};

export const TrayStepContent: React.FC<Props> = ({
  children,
  scale = true,
  stepKey,
  skipEntering = false,
  skipExiting = false,
}) => {
  const fullScreenTransition = useFullScreenTransitionStart();

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
      // first render can skip enter because shell open already provides the arrival cue
      entering={
        skipEntering
          ? undefined
          : createMorphEntering(
              scale,
              stepKey ?? "unknown-step",
              fullScreenTransition,
            )
      }
      exiting={skipExiting ? undefined : createMorphExiting(scale)}
    >
      {children}
    </Animated.View>
  );
};
