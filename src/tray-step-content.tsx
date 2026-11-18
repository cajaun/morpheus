import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  interpolate,
  runOnUI,
  useAnimatedReaction,
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
  type TrayTransitionStartSignal,
  resolveTrayTransitionFullScreenChanged,
  resolveTrayTransitionGeneration,
  shouldWaitForTrayLayoutStart,
  useTrayTransitionStart,
  withTrayTransitionStart,
} from "./core/transition-start";
import { isTrayDebugLoggingEnabled, log } from "./core/logger";
import {
  FORWARD_CONTENT_MOTION,
  resolveMorphEnteringScale,
  resolveMorphExitingScale,
  resolveActiveFullScreenBoundaryExit,
  type TrayContentMotionDirection,
  useTrayContentMotionDirection,
} from "./core/transition-motion-direction";
import {
  TRAY_INSTRUMENTATION_ENABLED,
  isTrayInstrumentationEnabled,
} from "./telemetry/config";
import { recordTrayTelemetry } from "./telemetry/tray-telemetry-buffer";
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
  style?: StyleProp<ViewStyle>;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
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
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  recordTrayTelemetry("step-enter-finished", {
    stepKey,
    finishedAt: Number(finishedAt.toFixed(2)),
  });
};

// record when incoming content releases its visibility latch. startedAt is
// when the JS thread received the signal, so it is late whenever JS is busy;
// joinDelayMs is measured on the UI thread and is how many ms after the shared
// transition clock started this content actually began animating.
const logStepEnterStarted = (stepKey: string, joinDelayMs: number) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  markTrayStepContentReleased(stepKey);

  recordTrayTelemetry("step-enter-started", {
    stepKey,
    startedAt: Number(performance.now().toFixed(2)),
    joinDelayMs: Number(joinDelayMs.toFixed(2)),
  });
};

// Build the incoming content animations that follow the shared transition
// clock. Used by the entering layout animation (content mounted on the step
// change) and by the reveal of a preloaded step (content already mounted), so
// both move identically on the same clock.
const buildMorphEnteringAnimations = (
  scale: boolean,
  stepKey: string,
  transitionStart: TrayTransitionStart | null,
  motionDirection: TrayContentMotionDirection | null,
  onOpacityFinished?: (finished?: boolean) => void,
) => {
  "worklet";

  const synchronizedFullScreen =
    resolveTrayTransitionFullScreenChanged(transitionStart);
  const transitionGeneration =
    resolveTrayTransitionGeneration(transitionStart);
  const waitForLayoutStart = shouldWaitForTrayLayoutStart(
    transitionStart,
    transitionGeneration,
  );
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
    onStart?: TrayTransitionStartSignal,
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
        TRAY_INSTRUMENTATION_ENABLED
        ? (clockStartedAt: number, _generation: number, joinedAt: number) => {
            "worklet";
            scheduleOnRN(
              logStepEnterStarted,
              stepKey,
              Math.max(0, joinedAt - clockStartedAt),
            );
          }
        : undefined,
    );

    return synchronizedAnimation;
  };

  return {
    initialScale,
    opacity: synchronizeWithLayout(
      withTiming(
        1,
        {
          duration,
          easing,
        },
        onOpacityFinished,
      ),
      true,
    ),
    scale: synchronizeWithLayout(
      withTiming(1, {
        duration,
        easing,
      }),
    ),
    translateY: synchronizeWithLayout(
      withTiming(0, {
        duration,
        easing,
      }),
    ),
  };
};

const logEnterFinishedWorklet = (stepKey: string, finished?: boolean) => {
  "worklet";

  if (finished && __DEV__ && TRAY_INSTRUMENTATION_ENABLED) {
    scheduleOnRN(logStepEnterFinished, stepKey, performance.now());
  }
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

    const animations = buildMorphEnteringAnimations(
      scale,
      stepKey,
      transitionStart,
      motionDirection,
    );

    return {
      initialValues: {
        opacity: 0,
        transform: [
          { scale: animations.initialScale },
          { translateY: 0 },
        ],
      },
      animations: {
        opacity: animations.opacity,
        transform: [
          { scale: animations.scale },
          { translateY: animations.translateY },
        ],
      },
      callback: (finished: boolean) => {
        logEnterFinishedWorklet(stepKey, finished);
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
    const waitForLayoutStart = shouldWaitForTrayLayoutStart(
      transitionStart,
      transitionGeneration,
    );
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

// Step content that can be mounted while hidden: a preloaded step inside a
// hidden <Activity>. Reanimated's entering animation fires when a view is
// mounted, which for a preloaded step is before it is shown, so this content
// runs the same entering motion itself when it is shown. Effects inside a
// hidden <Activity> are created only once it becomes visible, so the layout
// effect below runs exactly when the step appears: on mount if it mounted
// visible, otherwise on reveal. Exiting is unchanged: the step is removed, not
// hidden, when it leaves, so the exiting animation still runs.
export const TrayRevealedStepContent: React.FC<Props> = ({
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
  const opacity = useSharedValue(skipEntering ? 1 : 0);
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
    const latest = latestRef.current;
    const firstShow = shownCountRef.current === 0;
    shownCountRef.current += 1;

    if (firstShow && latest.skipEntering) {
      // the opening tray is the arrival cue; start at the resting values
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
    // runs on each show (see above), never on prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

// render keyed step content with synchronized entering and exiting motion
export const TrayStepContent: React.FC<Props> = ({
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
      // Keep only keyboard sheet handoffs as real native layers while the
      // sheet is relaid out; fullscreen retains its existing path on main.
      collapsable={
        transitionStart?.keyboardStepTransition === true ? false : undefined
      }
      // scale fullscreen layers from the body boundary so they stay below the header
      style={
        [
          anchorScaleToTop
            ? {
                // the parent content frame owns boundary geometry this layer only establishes the fullscreen viewport required by tray pages
                flex: 1,
                transformOrigin: ["50%", "0%", 0],
              }
            : undefined,
          style,
        ]
      }
      pointerEvents={pointerEvents}
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

// The title slides between its source and target centered offsets on the
// shared morph clock. The source width must be the width on screen when a
// transition starts. Without this, the start width kept the value from the
// transition before (two titles ago), so on the frames between the clock
// reset and the new title's onLayout the title jumped toward a stale offset,
// then snapped back once measured.
export const resolveSettledTitleStartWidth = (
  progress: number,
  previousProgress: number | null,
  startWidth: number,
  width: number,
) => {
  "worklet";

  const transitionSettled = progress >= 1;
  const transitionRestarted =
    previousProgress !== null && progress < previousProgress;

  return transitionSettled || transitionRestarted ? width : startWidth;
};

type TrayHeaderTransitionRowProps = {
  title: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  transition: TrayHeaderTransitionValue;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

// Header motion is a step-content participant, so its title and action group
// use the same transition lifecycle as the incoming body.
const TrayHeaderTransitionRowImpl: React.FC<TrayHeaderTransitionRowProps> = ({
  title,
  left,
  right,
  transition,
  style,
  className,
}) => {
  const morphProgress = useOptionalTrayMorphProgress();
  const transitionStart = useTrayTransitionStart();
  const rowWidth = useSharedValue(0);
  const titleStartWidth = useSharedValue(0);
  const titleWidth = useSharedValue(0);
  const previousLeftVisibleRef = useRef<boolean | null>(null);
  const centered = left != null;
  const sourceCentered = previousLeftVisibleRef.current ?? centered;
  const leftIdentity = resolveHeaderActionIdentity(left);
  const rightIdentity = resolveHeaderActionIdentity(right);
  const actionTransitionKey = `${left == null ? "none" : leftIdentity ?? "left"}:${right == null ? "none" : rightIdentity ?? "right"}`;
  const wholeHeaderBoundaryAnimation =
    transition.fullScreenBoundaryExit &&
    transitionStart?.fullScreenChanged === true;

  useEffect(() => {
    previousLeftVisibleRef.current = centered;
  }, [centered]);

  // Keep the slide's source width equal to the width on screen whenever a
  // transition settles or restarts (see resolveSettledTitleStartWidth).
  useAnimatedReaction(
    () => morphProgress?.value ?? 1,
    (progress, previousProgress) => {
      const nextStartWidth = resolveSettledTitleStartWidth(
        progress,
        previousProgress,
        titleStartWidth.value,
        titleWidth.value,
      );

      if (nextStartWidth !== titleStartWidth.value) {
        titleStartWidth.value = nextStartWidth;
      }
    },
    [morphProgress],
  );

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

  // Only the title layer (translateX) and the TrayStepContent layers
  // (entering/exiting) animate. The row, title viewport and control slots
  // carry static styles, so they are plain Views; collapsable={false} keeps
  // the native view hierarchy identical to the previous Animated.Views.
  return (
    <View
      collapsable={false}
      className={className}
      style={[
        headerMotionStyles.headerRow,
        headerMotionStyles.animatedHeaderRow,
        style,
      ]}
      onLayout={handleRowLayout}
    >
      <View
        collapsable={false}
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
      </View>

      <TrayStepContent
        stepKey={`header-actions-${actionTransitionKey}`}
        scale={false}
        fullScreenBoundaryExit={transition.fullScreenBoundaryExit}
        skipEntering={
          transition.skipEntering || wholeHeaderBoundaryAnimation
        }
        skipExiting={wholeHeaderBoundaryAnimation}
        style={headerMotionStyles.actionTransitionLayer}
        pointerEvents="box-none"
      >
        <View
          collapsable={false}
          pointerEvents={centered ? "auto" : "none"}
          style={headerMotionStyles.leadingControlSlot}
        >
          {left}
        </View>
        <View
          collapsable={false}
          pointerEvents={right != null ? "auto" : "none"}
          style={headerMotionStyles.trailingControlSlot}
        >
          {right}
        </View>
      </TrayStepContent>
    </View>
  );
};

const areTrayHeaderTransitionRowPropsEqual = (
  previous: TrayHeaderTransitionRowProps,
  next: TrayHeaderTransitionRowProps,
) =>
  previous.title === next.title &&
  previous.left === next.left &&
  previous.right === next.right &&
  previous.style === next.style &&
  previous.className === next.className &&
  previous.transition.stepKey === next.transition.stepKey &&
  previous.transition.skipEntering === next.transition.skipEntering &&
  previous.transition.fullScreenBoundaryExit ===
    next.transition.fullScreenBoundaryExit;

// Header actions are often recreated by the shell while their semantic inputs
// stay unchanged. Keep the animation participant mounted across those shell
// notifications; actual transition fields remain part of the comparison.
export const TrayHeaderTransitionRow = React.memo(
  TrayHeaderTransitionRowImpl,
  areTrayHeaderTransitionRowPropsEqual,
);

TrayHeaderTransitionRow.displayName = "TrayHeaderTransitionRow";

const resolveHeaderActionIdentity = (
  action: React.ReactNode,
): string | null => {
  if (!React.isValidElement(action)) {
    return action == null ? null : "anonymous-action";
  }

  if (action.key != null) {
    return String(action.key);
  }

  const actionType = action.type as { displayName?: string; name?: string };
  return actionType.displayName ?? actionType.name ?? "anonymous-action";
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
  actionTransitionLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
