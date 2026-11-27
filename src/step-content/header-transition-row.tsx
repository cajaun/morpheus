import React, { useRef } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useTrayTransitionStart } from "../core/transition-start";
import { useOptionalTrayMorphProgress } from "../core/tray-morph-progress";
import {
  type TrayHeaderTransitionValue,
  useTrayHeaderTransition,
} from "../primitives/header-transition-context";
import {
  TRAY_HEADER_CLOSE_BUTTON_SIZE,
  TRAY_HEADER_CONTENT_HEIGHT,
} from "../core/constants";
import { type TrayStepContentProps } from "./types";
import { TrayStepContent } from "./step-content";
import { useProfiledTrayEffect } from "../telemetry/tray-layout-effect-profiler";

// the title's slide starts from the width on screen when a transition starts, a restart uses the previous frame's width so the title slides instead of jumping
export const resolveSettledTitleStartWidth = (
  progress: number,
  previousProgress: number | null,
  startWidth: number,
  width: number,
  previousWidth: number = width,
) => {
  "worklet";

  const transitionRestarted =
    previousProgress !== null && progress < previousProgress;

  if (transitionRestarted) {
    return previousWidth;
  }

  return progress >= 1 ? width : startWidth;
};

export type TrayHeaderTransitionRowProps = {
  title: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  transition: TrayHeaderTransitionValue;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

// header motion is a step-content participant on the same lifecycle as the incoming body
export const TrayHeaderTransitionRowImpl: React.FC<
  TrayHeaderTransitionRowProps
> = ({ title, left, right, transition, style, className }) => {
  const morphProgress = useOptionalTrayMorphProgress();
  const rowWidth = useSharedValue(0);
  const titleStartWidth = useSharedValue(0);
  const titleWidth = useSharedValue(0);
  const previousLeftVisibleRef = useRef<boolean | null>(null);
  const centered = left != null;
  const sourceCentered = previousLeftVisibleRef.current ?? centered;
  const leftIdentity = resolveHeaderActionIdentity(left);
  const rightIdentity = resolveHeaderActionIdentity(right);
  const actionTransitionKey = `${left == null ? "none" : (leftIdentity ?? "left")}:${right == null ? "none" : (rightIdentity ?? "right")}`;

  useProfiledTrayEffect("step-content/header-transition-row#1", () => {
    previousLeftVisibleRef.current = centered;
  }, [centered]);

  // keep the slide's source width equal to the on-screen width when a transition settles or restarts
  useAnimatedReaction(
    () => [morphProgress?.value ?? 1, titleWidth.value],
    (current, previous) => {
      const progress = current[0]!;
      const nextStartWidth = resolveSettledTitleStartWidth(
        progress,
        previous ? previous[0]! : null,
        titleStartWidth.value,
        current[1]!,
        previous ? previous[1]! : current[1]!,
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

  // the title layer and the step content layers animate, static rows are plain Views with collapsable={false}
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
          <TrayHeaderTransitionLayer
            stepKey={`${transition.stepKey}-header-title`}
            transition={transition}
          >
            {title}
          </TrayHeaderTransitionLayer>
        </Animated.View>
      </View>

      <TrayHeaderTransitionLayer
        stepKey={`header-actions-${actionTransitionKey}`}
        transition={transition}
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
      </TrayHeaderTransitionLayer>
    </View>
  );
};

// one animated participant reading its own per-step transition so the row skips re-rendering a hidden header's animated view
export const TrayHeaderTransitionLayer = ({
  stepKey,
  transition: fallbackTransition,
  style,
  pointerEvents,
  children,
}: {
  stepKey: string;
  transition: TrayHeaderTransitionValue;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: TrayStepContentProps["pointerEvents"];
  children: React.ReactNode;
}) => {
  const transitionStart = useTrayTransitionStart();
  // read the transition from context because the row skips renders when these flags change
  const transition = useTrayHeaderTransition() ?? fallbackTransition;
  const wholeHeaderBoundaryAnimation =
    transition.fullScreenBoundaryExit &&
    transitionStart?.fullScreenChanged === true;

  return (
    <TrayStepContent
      stepKey={stepKey}
      scale={false}
      fullScreenBoundaryExit={transition.fullScreenBoundaryExit}
      skipEntering={transition.skipEntering || wholeHeaderBoundaryAnimation}
      skipExiting={wholeHeaderBoundaryAnimation}
      style={style}
      pointerEvents={pointerEvents}
    >
      {children}
    </TrayStepContent>
  );
};

export const areTrayHeaderTransitionRowPropsEqual = (
  previous: TrayHeaderTransitionRowProps,
  next: TrayHeaderTransitionRowProps,
) =>
  previous.title === next.title &&
  previous.left === next.left &&
  previous.right === next.right &&
  previous.style === next.style &&
  previous.className === next.className &&
  // the row uses the step key, its layers read the flags so a flag change skips the animated title
  previous.transition.stepKey === next.transition.stepKey;

// keep the participant mounted when the shell recreates actions with unchanged inputs
export const TrayHeaderTransitionRow = React.memo(
  TrayHeaderTransitionRowImpl,
  areTrayHeaderTransitionRowPropsEqual,
);

TrayHeaderTransitionRow.displayName = "TrayHeaderTransitionRow";

export const resolveHeaderActionIdentity = (
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

export const headerMotionStyles = StyleSheet.create({
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
