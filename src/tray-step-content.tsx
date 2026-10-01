import React, { useEffect, useRef } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  FULL_SCREEN_CONTENT_EASING_POINTS,
  FULL_SCREEN_ENTERING_DURATION,
  FULL_SCREEN_EXITING_DURATION,
  MORPH_ENTERING_DURATION,
  MORPH_EXITING_DURATION,
  MORPH_LAYOUT_DURATION,
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
import { useOptionalTrayMorphProgress } from "./core/tray-morph-progress";
import type { TrayHeaderTransitionValue } from "./primitives/header-transition-context";
import {
  TRAY_HEADER_CLOSE_BUTTON_SIZE,
  TRAY_HEADER_CONTENT_HEIGHT,
} from "./core/constants";

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

// record the end of an entering content animation for timing inspection
const logStepEnterFinished = (stepKey: string, finishedAt: number) => {
  if (!isActionTrayInstrumentationEnabled()) {
    return;
  }

  console.log("[step-enter-finished]", {
    stepKey,
    finishedAt: Number(finishedAt.toFixed(2)),
  });
};

// record when incoming content releases its visibility latch
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

// build the entering animation that follows the shared transition clock
const createMorphEntering = (
  scale: boolean,
  stepKey: string,
  transitionStart: TrayTransitionStart | null,
  motionDirection: TrayContentMotionDirection | null,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    const synchronizedFullScreen =
      resolveTrayTransitionFullScreenChanged(transitionStart);
    const transitionGeneration =
      resolveTrayTransitionGeneration(transitionStart);
    // content must not become the transition clock owner the shell layout participant establishes the existing clock for every real transition
    const waitForLayoutStart =
      transitionStart !== null && transitionGeneration > 0;
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
        waitForLayoutStart,
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

// build the exiting animation that follows the shared transition clock
const createMorphExiting = (
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
    const waitForLayoutStart =
      transitionStart !== null && transitionGeneration > 0;
    const activeFullScreenBoundaryExit =
      resolveActiveFullScreenBoundaryExit(
        fullScreenBoundaryExit,
        synchronizedFullScreen,
      );
    const keyboardStepTransition =
      transitionStart?.keyboardStepTransition === true;
    const duration = keyboardStepTransition
      ? activeFullScreenBoundaryExit
        ? FULL_SCREEN_EXITING_DURATION
        : MORPH_LAYOUT_DURATION
      : activeFullScreenBoundaryExit
        ? FULL_SCREEN_EXITING_DURATION
        : MORPH_EXITING_DURATION;
    const easing = activeFullScreenBoundaryExit
      ? FULL_SCREEN_CONTENT_EASING
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

// render keyed step content with synchronized entering and exiting motion
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
      // Keep only keyboard sheet handoffs as real native layers while the
      // sheet is relaid out; fullscreen retains its existing path on main.
      collapsable={
        transitionStart?.keyboardStepTransition === true ? false : undefined
      }
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

type TrayHeaderTransitionRowProps = {
  title: React.ReactNode;
  closeButton: React.ReactNode;
  transition: TrayHeaderTransitionValue;
  style?: StyleProp<ViewStyle>;
  className?: string;
  returnButton?: React.ReactNode;
};

// Header motion is a step-content participant, so its controls and title use
// the same transition lifecycle and morph progress as the incoming body.
export const TrayHeaderTransitionRow: React.FC<
  TrayHeaderTransitionRowProps
> = ({
  title,
  closeButton,
  transition,
  style,
  className,
  returnButton,
}) => {
  const morphProgress = useOptionalTrayMorphProgress();
  const transitionStart = useTrayTransitionStart();
  const rowWidth = useSharedValue(0);
  const titleStartWidth = useSharedValue(0);
  const titleWidth = useSharedValue(0);
  const previousCenteredRef = useRef<boolean | null>(null);
  const previousReturnButtonRef = useRef<React.ReactNode>(null);
  const centered = returnButton != null;
  const sourceCentered = previousCenteredRef.current ?? centered;
  const wholeHeaderBoundaryAnimation =
    transition.fullScreenBoundaryExit &&
    transitionStart?.fullScreenChanged === true;

  useEffect(() => {
    previousCenteredRef.current = centered;
    if (returnButton != null) {
      previousReturnButtonRef.current = returnButton;
    }
  }, [centered, returnButton]);

  const titlePositionStyle = useAnimatedStyle(() => {
    const progress = morphProgress?.value ?? 1;
    const startWidth = titleStartWidth.value || titleWidth.value;
    const endWidth = titleWidth.value;
    const startOffset = sourceCentered
      ? Math.max(0, (rowWidth.value - startWidth) / 2)
      : 0;
    const endOffset = centered
      ? Math.max(0, (rowWidth.value - endWidth) / 2)
      : 0;

    return {
      transform: [
        {
          translateX: interpolate(progress, [0, 1], [startOffset, endOffset]),
        },
      ],
    };
  });

  const returnButtonStyle = useAnimatedStyle(() => {
    const progress = morphProgress?.value ?? 1;
    const startOpacity = sourceCentered ? 1 : 0;
    const endOpacity = centered ? 1 : 0;

    return {
      opacity: interpolate(progress, [0, 1], [startOpacity, endOpacity]),
      transform: [
        {
          // the reference fades the return control in place; title motion
          // provides the horizontal choreography
          translateX: 0,
        },
      ],
    };
  });

  const closeButtonStyle = useAnimatedStyle(() => {
    const progress = morphProgress?.value ?? 1;
    const startOpacity = sourceCentered ? 0 : 1;
    const endOpacity = centered ? 0 : 1;

    return {
      opacity: interpolate(progress, [0, 1], [startOpacity, endOpacity]),
    };
  });

  const handleRowLayout = (event: LayoutChangeEvent) => {
    rowWidth.value = event.nativeEvent.layout.width;
  };

  const handleTitleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (Math.abs(nextWidth - titleWidth.value) < 0.5) {
      return;
    }

    titleStartWidth.value = titleWidth.value || nextWidth;
    titleWidth.value = nextWidth;
  };

  return (
    <Animated.View
      className={className}
      style={[
        headerMotionStyles.headerRow,
        headerMotionStyles.animatedHeaderRow,
        style,
      ]}
      onLayout={handleRowLayout}
    >
      <Animated.View
        pointerEvents="none"
        style={headerMotionStyles.titleViewport}
      >
        <Animated.View
          onLayout={handleTitleLayout}
          style={[headerMotionStyles.titleLayer, titlePositionStyle]}
        >
          <TrayStepContent
            stepKey={`${transition.stepKey}-header-title`}
            scale={false}
            fullScreenBoundaryExit={transition.fullScreenBoundaryExit}
            skipEntering={
              transition.skipEntering || wholeHeaderBoundaryAnimation
            }
            skipExiting={wholeHeaderBoundaryAnimation}
          >
            {title}
          </TrayStepContent>
        </Animated.View>
      </Animated.View>

      <Animated.View
        pointerEvents={centered ? "auto" : "none"}
        style={[headerMotionStyles.leadingControlSlot, returnButtonStyle]}
      >
        {returnButton ?? previousReturnButtonRef.current}
      </Animated.View>

      <Animated.View
        pointerEvents={centered ? "none" : "auto"}
        style={[headerMotionStyles.trailingControlSlot, closeButtonStyle]}
      >
        {closeButton}
      </Animated.View>
    </Animated.View>
  );
};

const headerMotionStyles = StyleSheet.create({
  headerRow: {
    height: TRAY_HEADER_CONTENT_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  animatedHeaderRow: {
    position: "relative",
  },
  titleViewport: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    overflow: "visible",
  },
  titleLayer: {
    alignSelf: "flex-start",
    height: "100%",
    justifyContent: "center",
  },
  leadingControlSlot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    zIndex: 2,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  trailingControlSlot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    zIndex: 2,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
