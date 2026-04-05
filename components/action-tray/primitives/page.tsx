import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  EntryExitAnimationFunction,
  Easing,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SCREEN_WIDTH } from "../core/constants";
import { useTrayPageTransition } from "../page-transition-context";

const PAGE_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
} as const;

const createPageEntering = (
  direction: { value: -1 | 0 | 1 },
  slideActive: { value: boolean },
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    if (!slideActive.value) {
      return {
        initialValues: {
          opacity: 0,
          transform: [{ translateY: 6 }],
        },
        animations: {
          opacity: withTiming(1, {
            duration: 350,
            easing: Easing.bezier(0.26, 0.08, 0.25, 1),
          }),
          transform: [
            {
              translateY: withTiming(0, {
                duration: 350,
                easing: Easing.bezier(0.26, 0.08, 0.25, 1),
              }),
            },
          ],
        },
      };
    }

    const resolvedDirection = direction.value === -1 ? -1 : 1;

    return {
      initialValues: {
        transform: [
          {
            translateX:
              resolvedDirection === 1 ? SCREEN_WIDTH : -SCREEN_WIDTH,
          },
        ],
      },
      animations: {
        transform: [
          {
            translateX: withSpring(0, PAGE_SPRING_CONFIG),
          },
        ],
      },
    };
  };
};

const createPageExiting = (
  direction: { value: -1 | 0 | 1 },
  slideActive: { value: boolean },
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    if (!slideActive.value) {
      return {
        initialValues: {
          opacity: 1,
          transform: [{ translateY: 0 }],
        },
        animations: {
          opacity: withTiming(0, {
            duration: 190,
            easing: Easing.bezier(0.26, 0.08, 0.25, 1),
          }),
          transform: [
            {
              translateY: withTiming(6, {
                duration: 190,
                easing: Easing.bezier(0.26, 0.08, 0.25, 1),
              }),
            },
          ],
        },
      };
    }

    const resolvedDirection = direction.value === -1 ? -1 : 1;

    return {
      initialValues: {
        transform: [{ translateX: 0 }],
      },
      animations: {
        transform: [
          {
            translateX: withSpring(
              resolvedDirection === 1 ? -SCREEN_WIDTH : SCREEN_WIDTH,
              PAGE_SPRING_CONFIG,
            ),
          },
        ],
      },
    };
  };
};

export const TrayPage: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, style, className }) => {
  const transition = useTrayPageTransition();

  const shouldHandleTransition =
    transition?.fullScreen === true &&
    transition.fullScreenTransition === "slide" &&
    transition.slideCapable;

  return (
    <Animated.View
      key={transition?.stepKey ?? "tray-page"}
      entering={
        shouldHandleTransition
          ? createPageEntering(transition.direction, transition.slideActive)
          : undefined
      }
      exiting={
        shouldHandleTransition
          ? createPageExiting(transition.direction, transition.slideActive)
          : undefined
      }
      style={style}
      className={className}
    >
      {children}
    </Animated.View>
  );
};

TrayPage.displayName = "TrayPage";
