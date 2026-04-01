import React, { useEffect } from "react";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  withTiming,
} from "react-native-reanimated";
import { MORPH_DURATION } from "./constants";

type Props = {
  children: React.ReactNode;
  scale?: boolean;
  stepKey?: string;
  skipEntering?: boolean;
  skipExiting?: boolean;
  step?: number;
  total?: number;
};

const createMorphEntering = (scale: boolean): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    return {
      initialValues: {
        opacity: 0,
        transform: [...(scale ? [{ scale: 0.93 }] : []), { translateY: 6 }],
      },
      animations: {
        opacity: withTiming(1, {
          duration: MORPH_DURATION,
          easing: Easing.bezier(0.26, 0.08, 0.25, 1),
        }),
        transform: [
          ...(scale
            ? [
                {
                  scale: withTiming(1, {
                    duration: MORPH_DURATION,
                    easing: Easing.bezier(0.26, 0.08, 0.25, 1),
                  }),
                },
              ]
            : []),
          {
            translateY: withTiming(0, {
              duration: MORPH_DURATION,
              easing: Easing.bezier(0.26, 0.08, 0.25, 1),
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
        transform: [...(scale ? [{ scale: 1 }] : []), { translateY: 0 }],
      },
      animations: {
        opacity: withTiming(0, {
          duration: 190,
          easing: Easing.bezier(0.26, 0.08, 0.25, 1),
        }),
        transform: [
          ...(scale
            ? [
                {
                  scale: withTiming(0.95, {
                    duration: 190,
                    easing: Easing.bezier(0.26, 0.08, 0.25, 1),
                  }),
                },
              ]
            : []),
          {
            translateY: withTiming(6, {
              duration: 190,
              easing: Easing.bezier(0.26, 0.08, 0.25, 1),
            }),
          },
        ],
      },
    };
  };
};

export const TrayContent: React.FC<Props> = ({
  children,
  scale = true,
  stepKey,
  skipEntering = false,
  skipExiting = false,
  step,
  total,
}) => {
  useEffect(() => {
    console.log("[TrayContent] render", {
      step,
      total,
      stepKey,
    });
  }, [step, total, stepKey]);

  return (
    <Animated.View
      key={stepKey}
      entering={skipEntering ? undefined : createMorphEntering(scale)}
      exiting={skipExiting ? undefined : createMorphExiting(scale)}
    >
      {React.cloneElement(children as any, { step, total })}
    </Animated.View>
  );
};

TrayContent.displayName = "TrayContent";
