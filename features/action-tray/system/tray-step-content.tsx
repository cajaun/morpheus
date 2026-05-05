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

export const MORPH_EASING = Easing.bezier(0.25, 1.0, 0.5, 1);
export const SHEET_EASING = Easing.bezier(0.34, 1.12, 0.64, 1);

const createMorphEntering = (scale: boolean): EntryExitAnimationFunction => {
  return () => {
    "worklet";
    return {
      initialValues: {
        opacity: 0,
        transform: [{ scale: scale ? 1.05 : 1 }, { translateY: 0 }],
      
      },
      animations: {
        opacity: withTiming(1, { duration: MORPH_DURATION, easing: MORPH_EASING }),
        transform: [
          { scale: withTiming(1, { duration: MORPH_DURATION, easing: MORPH_EASING }) },
          { translateY: withTiming(0, { duration: MORPH_DURATION, easing: MORPH_EASING }) },
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
