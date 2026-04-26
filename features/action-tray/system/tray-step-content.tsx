import React, { useEffect } from "react";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  withTiming,
} from "react-native-reanimated";
import { MORPH_DURATION } from "./core/constants";
import { log } from "./core/logger";

// content transitions live here so every step swap shares the same motion language
type Props = {
  children: React.ReactNode;
  scale?: boolean;
  stepKey?: string;
  skipEntering?: boolean;
  skipExiting?: boolean;
};

const MORPH_EASING = Easing.bezier(0.26, 0.08, 0.25, 1);

const createMorphEntering = (scale: boolean): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    return {
      initialValues: {
        opacity: 0,
        transform: [
          { scale: scale ? 0.95 : 1 },
          { translateY: 6 },
        ],
      },
      animations: {
        opacity: withTiming(1, {
          duration: MORPH_DURATION,
          easing: MORPH_EASING,
        }),
        transform: [
          {
            scale: withTiming(scale ? 1 : 1, {
              duration: MORPH_DURATION,
              easing: MORPH_EASING,
            }),
          },
          {
            translateY: withTiming(0, {
              duration: MORPH_DURATION,
              easing: MORPH_EASING,
            }),
          },
        ],
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
        transform: [
          { scale: 1 },
          { translateY: 0 },
        ],
      },
      animations: {
        opacity: withTiming(0, {
          duration: 190, // slightly faster for snappier exit
          easing: MORPH_EASING,
        }),
        transform: [
          {
            scale: withTiming(scale ? 1.05 : 1, { // 🔥 scale OUT
              duration: 160,
              easing: Easing.out(Easing.cubic),
            }),
          },
          {
            translateY: withTiming(6, {
              duration: 160,
              easing: MORPH_EASING,
            }),
          },
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
      entering={skipEntering ? undefined : createMorphEntering(scale)}
      exiting={skipExiting ? undefined : createMorphExiting(scale)}
    >
      {children}
    </Animated.View>
  );
};
