import React, { useEffect } from "react";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  type SharedValue,
  withTiming,
} from "react-native-reanimated";
import { MORPH_DURATION } from "./core/constants";
import { StyleProp, ViewStyle } from "react-native";
import { log } from "./core/logger";
import {
  TrayFullScreenTransition,
  TrayPageTransitionProvider,
  TrayTransitionDirection,
} from "./page-transition-context";

type Props = {
  children: React.ReactNode;
  scale?: boolean;
  fullScreen?: boolean;
  fullScreenDraggable?: boolean;
  fullScreenTransition?: TrayFullScreenTransition;
  stepKey?: string;
  skipEntering?: boolean;
  skipExiting?: boolean;
  step?: number;
  total?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  transitionDirection?: TrayTransitionDirection;
  fullScreenSlideEnabled?: boolean;
  transitionDirectionShared?: SharedValue<TrayTransitionDirection>;
  fullScreenSlideActiveShared?: SharedValue<boolean>;
};

const createMorphEntering = (scale: boolean): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    return {
      initialValues: {
        opacity: 0,
        transform: [...(scale ? [{ scale: 0.95 }] : []), { translateY: 6 }],
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
  fullScreen = false,
  fullScreenDraggable = true,
  fullScreenTransition = "morph",
  stepKey,
  skipEntering = false,
  skipExiting = false,
  step,
  total,
  style,
  className,
  transitionDirection = 0,
  fullScreenSlideEnabled = false,
  transitionDirectionShared,
  fullScreenSlideActiveShared,
}) => {
  const shouldUsePageTransitionShell =
    fullScreen && fullScreenTransition === "slide";

  useEffect(() => {
    log("TrayContent props", {
      stepKey,
      step,
      total,
      skipEntering,
      skipExiting,
      fullScreen,
      fullScreenDraggable,
      fullScreenTransition,
      transitionDirection,
      fullScreenSlideEnabled,
      hasTransitionDirectionShared: transitionDirectionShared != null,
      hasFullScreenSlideActiveShared: fullScreenSlideActiveShared != null,
      hasClassName: className != null,
      hasStyle: style != null,
    });
  }, [
    className,
    fullScreen,
    fullScreenDraggable,
    fullScreenSlideEnabled,
    fullScreenTransition,
    skipEntering,
    skipExiting,
    step,
    stepKey,
    style,
    total,
    transitionDirection,
    transitionDirectionShared,
    fullScreenSlideActiveShared,
  ]);

  useEffect(() => {
    log("TrayContent mounted", {
      stepKey,
      step,
    });

    return () => {
      log("TrayContent unmounted", {
        stepKey,
        step,
      });
    };
  }, [step, stepKey]);

  return (
    <TrayPageTransitionProvider
      value={{
        stepKey,
        fullScreen,
        fullScreenTransition,
        slideCapable: shouldUsePageTransitionShell,
        direction:
          transitionDirectionShared ??
          ({ value: transitionDirection } as SharedValue<TrayTransitionDirection>),
        slideActive:
          fullScreenSlideActiveShared ??
          ({ value: fullScreenSlideEnabled } as SharedValue<boolean>),
      }}
    >
      <Animated.View
        key={shouldUsePageTransitionShell ? "tray-fullscreen-shell" : stepKey}
        entering={
          shouldUsePageTransitionShell || skipEntering
            ? undefined
            : createMorphEntering(scale)
        }
        exiting={
          shouldUsePageTransitionShell || skipExiting
            ? undefined
            : createMorphExiting(scale)
        }
        style={style}
        className={className}
      >
        {React.cloneElement(children as any, {
          step,
          total,
          fullScreen,
          fullScreenDraggable,
          fullScreenTransition,
          transitionDirection,
          fullScreenSlideEnabled,
          transitionDirectionShared,
          fullScreenSlideActiveShared,
        })}
      </Animated.View>
    </TrayPageTransitionProvider>
  );
};

TrayContent.displayName = "TrayContent";
