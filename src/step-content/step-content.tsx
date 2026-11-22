import React, { useEffect, useLayoutEffect, useRef } from "react";
import Animated, {
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useTrayTransitionStart } from "../core/transition-start";
import { isTrayDebugLoggingEnabled, log } from "../core/logger";
import { useTrayContentMotionDirection } from "../core/transition-motion-direction";
import { type TrayStepContentProps } from "./types";
import {
  buildMorphEnteringAnimations,
  logEnterFinishedWorklet,
  createMorphEntering,
  createMorphExiting,
} from "./morph-animations";

// wrapper of a preloadable step outside its Activity, mounts like any view, reveals with the entering motion and exits on removal
export const TrayRevealedStepContent: React.FC<TrayStepContentProps> = ({
  children,
  style,
  pointerEvents,
  scale = true,
  anchorScaleToTop = false,
  fullScreenBoundaryExit = false,
  stepKey,
  skipEntering = false,
  skipExiting = false,
  hidden = false,
}) => {
  const transitionStart = useTrayTransitionStart();
  const motionDirection = useTrayContentMotionDirection();
  const opacity = useSharedValue(skipEntering && !hidden ? 1 : 0);
  const contentScale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const shownCountRef = useRef(0);
  const latestRef = useRef({
    scale,
    stepKey,
    skipEntering,
    transitionStart,
    motionDirection,
  });
  latestRef.current = {
    scale,
    stepKey,
    skipEntering,
    transitionStart,
    motionDirection,
  };

  const revealStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: contentScale.value },
      { translateY: translateY.value },
    ],
  }));

  useLayoutEffect(() => {
    if (hidden) {
      return;
    }

    const latest = latestRef.current;
    const firstShow = shownCountRef.current === 0;
    shownCountRef.current += 1;

    if (firstShow && latest.skipEntering) {
      // the opening tray is the arrival cue, so start at the resting values
      return;
    }

    const key = latest.stepKey ?? "unknown-step";
    const contentScaleEnabled = latest.scale;
    const start = latest.transitionStart;
    const direction = latest.motionDirection;

    runOnUI(() => {
      "worklet";

      const animations = buildMorphEnteringAnimations(
        contentScaleEnabled,
        key,
        start,
        direction,
        (finished?: boolean) => {
          "worklet";
          logEnterFinishedWorklet(key, finished);
        },
      );

      opacity.value = 0;
      contentScale.value = animations.initialScale;
      translateY.value = 0;
      opacity.value = animations.opacity;
      contentScale.value = animations.scale;
      translateY.value = animations.translateY;
    })();
    // runs when the step shows, never on other prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  return (
    <Animated.View
      key={stepKey}
      collapsable={
        transitionStart?.keyboardStepTransition === true ? false : undefined
      }
      style={[
        anchorScaleToTop
          ? {
              flex: 1,
              transformOrigin: ["50%", "0%", 0],
            }
          : undefined,
        style,
        revealStyle,
      ]}
      pointerEvents={pointerEvents}
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

// keyed step content with synchronized entering and exiting motion
export const TrayStepContent: React.FC<TrayStepContentProps> = ({
  children,
  style,
  pointerEvents,
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
    if (!isTrayDebugLoggingEnabled()) {
      return;
    }

    log("TrayStepContent", {
      stepKey,
      skipEntering,
      skipExiting,
    });
  }, [skipEntering, skipExiting, stepKey]);

  return (
    <Animated.View
      key={stepKey}
      // keyboard sheet handoffs keep real native layers while the sheet relays out
      collapsable={
        transitionStart?.keyboardStepTransition === true ? false : undefined
      }
      // fullscreen layers scale from the body boundary so they stay below the header
      style={[
        anchorScaleToTop
          ? {
              // the parent frame owns boundary geometry, this layer sets the fullscreen viewport tray pages need
              flex: 1,
              transformOrigin: ["50%", "0%", 0],
            }
          : undefined,
        style,
      ]}
      pointerEvents={pointerEvents}
      // the first render skips entering because the shell open is the arrival cue
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
