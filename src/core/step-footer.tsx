// per-step footers live pinned to the sheet's bottom edge, an entering footer renders inside its step's content until the step change completes and then moves to the pinned layer in one commit
import { useCallback, useContext, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { measureTrayNode } from "./measure-node";
import {
  resolveFooterBackingHeight,
  splitFooterBackdrop,
  TrayFooterBackdrop,
  TrayFooterFade,
} from "./footer-backdrop";
import { TraySheetBottomAnchor } from "./footer-backing";
import { TrayRevealedStepContent } from "../tray-step-content";
import { createMorphExiting } from "../step-content/morph-animations";
import { useTrayContentMotionDirection } from "./transition-motion-direction";
import { useTrayTransitionStart } from "./transition-start";
import {
  BORDER_RADIUS,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_VERTICAL_PADDING,
} from "./constants/sheet";
import {
  TrayStepFooterMetricsContext,
  TrayStepFooterFrameStyleContext,
  TrayStepFooterMotionFlagsContext,
} from "./step-footer/contexts";
import {
  TrayStepFooterStoreContext,
  useStepFooterState,
  type TrayStepFooterExiting,
} from "./step-footer/placement-store";
import { useProfiledTrayEffect, useProfiledTrayLayoutEffect } from "../telemetry/tray-layout-effect-profiler";
export {
  EMPTY_STEP_FOOTER_STATE,
  resolveStepFooterState,
  createStepFooterStore,
  resolveStepFooterExit,
  TrayStepFooterStoreContext,
} from "./step-footer/placement-store";
export type {
  TrayStepFooterExiting,
  TrayStepFooterExitMode,
  TrayStepFooterPlacement,
  TrayStepFooterState,
  TrayStepFooterPayload,
  TrayStepFooterStore,
} from "./step-footer/placement-store";
export {
  TrayStepFooterMetricsContext,
  TrayStepFooterFrameStyleContext,
  TrayStepFooterMotionFlagsContext,
  TrayStepFooterRegionContext,
} from "./step-footer/contexts";
export type {
  TrayStepFooterMetrics,
  TrayStepFooterMotionFlags,
} from "./step-footer/contexts";

const useFooterReport = () => {
  const metrics = useContext(TrayStepFooterMetricsContext);

  return useCallback(
    (height: number) => {
      if (!metrics || !Number.isFinite(height)) {
        return false;
      }

      const next = Math.max(0, height);

      if (Math.abs(next - metrics.heightRef.current) < 0.5) {
        return false;
      }

      metrics.heightRef.current = next;
      metrics.height.value = next;
      return true;
    },
    [metrics],
  );
};

// the footer body, the same in both places, reports its height in the commit that shows it and on later resizes
type TrayStepFooterBodyFooter = Pick<
  TrayStepFooterExiting,
  "node" | "style"
> & { key: string | null };

const TrayStepFooterBody = ({
  state,
  inContent,
  reports = true,
}: {
  state: TrayStepFooterBodyFooter;
  inContent: boolean;
  // an exiting copy never sets the reserve, the next step owns it
  reports?: boolean;
}) => {
  const metrics = useContext(TrayStepFooterMetricsContext);
  const frameStyle = useContext(TrayStepFooterFrameStyleContext);
  const report = useFooterReport();
  const nodeRef = useRef<View>(null);
  const keyRef = useRef(state.key);
  keyRef.current = state.key;

  useProfiledTrayLayoutEffect("core/step-footer#2", () => {
    if (!reports) {
      return;
    }

    measureTrayNode(nodeRef.current, (_x, _y, _width, height) => {
      if (height > 0) {
        report(height);
      }
    });
  }, [report, reports, state.key, state.node]);

  // an entering footer holds its pin while touched, so the tap ends on the button it began on
  const store = useContext(TrayStepFooterStoreContext);
  const holdsPin = inContent && reports && store != null;
  const releasePinRef = useRef<(() => void) | null>(null);
  const releasePin = useCallback(() => {
    releasePinRef.current?.();
    releasePinRef.current = null;
  }, []);

  useProfiledTrayEffect("core/step-footer.releasePin", () => releasePin, [
    releasePin,
  ]);

  const touchHandlers = useMemo(() => {
    if (!holdsPin) {
      return null;
    }

    return {
      onTouchStart: () => {
        // take the new hold before dropping an old one so the footer never pins under a finger
        const previous = releasePinRef.current;
        releasePinRef.current = store!.holdPin();
        previous?.();
      },
      onTouchEnd: (event: GestureResponderEvent) => {
        if (event.nativeEvent.touches.length === 0) {
          releasePin();
        }
      },
      // a cancel is not a lifted finger, a gesture handler that activates on touch down (RectButton, Gesture.Native, a pan) cancels React Native's touches while its own gesture runs on, so the hold stays until the next touch on this footer ends, the step changes or the footer unmounts
    };
  }, [holdsPin, releasePin, store]);

  const key = state.key;
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!reports || key !== keyRef.current) {
        return;
      }

      if (report(event.nativeEvent.layout.height)) {
        metrics?.remeasureContentRef.current?.();
      }
    },
    [key, metrics, report, reports],
  );

  const { backdropColor, style: bodyStyle } = useMemo(
    () => splitFooterBackdrop(state.style),
    [state.style],
  );

  return (
    <View
      ref={nodeRef}
      collapsable={false}
      onLayout={handleLayout}
      {...touchHandlers}
      style={[
        styles.body,
        inContent ? styles.bodyInContent : styles.bodyPinned,
        bodyStyle,
      ]}
      pointerEvents="box-none"
    >
      <Animated.View style={frameStyle}>
        {/* inside the sheet's content a footer covers what passes behind it, a pinned footer's backing is drawn inside the sheet by TrayStepFooterBacking */}
        {inContent ? <TrayFooterBackdrop color={backdropColor} /> : null}
        {state.node}
      </Animated.View>
    </View>
  );
};

// draws an entering footer below its step's content, every content layer renders one and the host draws
export const TrayContentFooterSlot = ({ trayId }: { trayId: string }) => {
  const { state } = useStepFooterState();

  if (
    state.placement !== "content" ||
    state.key == null ||
    state.hostTrayId !== trayId
  ) {
    return null;
  }

  return (
    <View style={styles.contentSlot} pointerEvents="box-none">
      <TrayStepFooterBody state={state} inContent />
    </View>
  );
};

// records where each step layer's content ends in the content region, below the header, where an exiting footer starts
export const useStepFooterLayerRecorder = () => {
  const { store } = useStepFooterState();

  return useCallback(
    (trayId: string) => (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      store?.recordContentHeight(trayId, y + height);
    },
    [store],
  );
};

// draws a footer leaving with its step below that step's outgoing content, on the content's exit clock
export const TrayExitingFooterSlot = ({
  fullScreenBoundaryExit,
}: {
  fullScreenBoundaryExit: boolean;
}) => {
  const { store, state } = useStepFooterState();
  const transitionStart = useTrayTransitionStart();
  const motionDirection = useTrayContentMotionDirection();
  const exiting = state.exiting;

  if (exiting === null) {
    return null;
  }

  const top = store?.getContentHeight(exiting.hostTrayId);

  if (top === undefined) {
    return null;
  }

  return (
    <Animated.View
      key={`${exiting.key}:${exiting.generation}`}
      style={[styles.exitingSlot, { top }]}
      pointerEvents="none"
      // mounted with the step change, the content's exit animation runs as this copy's entrance so both leave on one clock
      entering={createMorphExiting(
        false,
        fullScreenBoundaryExit,
        transitionStart,
        motionDirection,
      )}
    >
      <TrayStepFooterBody state={exiting} inContent reports={false} />
    </Animated.View>
  );
};

// the pinned footer layer
export const TrayStepFooterLayers = ({
  skipEntering,
  fullScreenBoundaryExit,
}: {
  skipEntering: boolean;
  fullScreenBoundaryExit: boolean;
}) => {
  const metrics = useContext(TrayStepFooterMetricsContext);
  const { store, state } = useStepFooterState();
  const report = useFooterReport();
  const transitionStart = useTrayTransitionStart();
  const pendingGeneration = Math.max(
    state.placement === "content" ? state.generation : 0,
    state.exiting?.generation ?? 0,
  );

  // a step without a footer releases the reserve before the sheet measures the new content
  useProfiledTrayLayoutEffect("core/step-footer#3", () => {
    if (state.key == null) {
      report(0);
    }
  }, [report, state.key]);

  useProfiledTrayEffect("core/step-footer#1", () => () => {
      // release the reserve when the host is reused for another tray
      if (metrics) {
        metrics.heightRef.current = 0;
        metrics.height.value = 0;
      }
    },
    [metrics],
  );

  const settle = useCallback(
    (generation: number) => store?.settle(generation),
    [store],
  );
  const completedGeneration = transitionStart?.completedGeneration;

  // an entering footer moves here once its transition completes
  useAnimatedReaction(
    () =>
      pendingGeneration > 0 &&
      completedGeneration !== undefined &&
      completedGeneration.value >= pendingGeneration,
    (done, previous) => {
      if (done && previous !== true) {
        scheduleOnRN(settle, pendingGeneration);
      }
    },
    [completedGeneration, pendingGeneration, settle],
  );

  if (state.placement !== "pinned" || state.key == null) {
    return null;
  }

  return (
    <TrayRevealedStepContent
      key={state.key}
      stepKey={`footer:${state.key}`}
      scale={false}
      // show at once when it arrives from the content or with the opening tray, fade in place otherwise
      skipEntering={skipEntering || state.settled}
      // a footer that leaves with its content hands off to the exiting slot instead of fading here
      skipExiting={state.exit === "withContent"}
      fullScreenBoundaryExit={fullScreenBoundaryExit}
      pointerEvents="box-none"
    >
      <TrayStepFooterBody state={state} inContent={false} />
    </TrayRevealedStepContent>
  );
};

// a pinned footer's backing drawn inside the sheet, solid from its controls' top edge down with a fade above, so the sheet's one rounded edge draws the corner, it enters and leaves on the footer's own reveal so the two fade as one
export const TrayStepFooterBacking = ({
  frameStyle,
}: {
  frameStyle: React.ComponentProps<typeof Animated.View>["style"];
}) => {
  const metrics = useContext(TrayStepFooterMetricsContext);
  const flags = useContext(TrayStepFooterMotionFlagsContext);
  const { state } = useStepFooterState();
  const { backdropColor } = useMemo(
    () => splitFooterBackdrop(state.style),
    [state.style],
  );
  const metricsHeight = metrics?.height;
  const heightStyle = useAnimatedStyle(
    () => ({
      height: resolveFooterBackingHeight(
        metricsHeight?.value ?? 0,
        TRAY_FOOTER_PADDING_TOP,
      ),
    }),
    [metricsHeight],
  );
  const shown =
    state.placement === "pinned" && state.key != null && backdropColor != null;

  // the anchor stays mounted so a leaving backing can run its exit
  return (
    <TraySheetBottomAnchor style={frameStyle}>
      {shown ? (
        <TrayRevealedStepContent
          key={state.key}
          stepKey={`footer-backing:${state.key}`}
          scale={false}
          skipEntering={flags.skipEntering || state.settled}
          skipExiting={state.exit === "withContent"}
          fullScreenBoundaryExit={flags.fullScreenBoundaryExit}
          pointerEvents="none"
          style={styles.backing}
        >
          <Animated.View
            style={[
              styles.backingFill,
              { backgroundColor: backdropColor },
              heightStyle,
            ]}
          >
            <TrayFooterFade color={backdropColor} />
          </Animated.View>
        </TrayRevealedStepContent>
      ) : null}
    </TraySheetBottomAnchor>
  );
};

const styles = StyleSheet.create({
  body: {
    // a footer background follows the sheet's bottom corners
    borderBottomLeftRadius: BORDER_RADIUS,
    borderBottomRightRadius: BORDER_RADIUS,
    borderCurve: "continuous",
    paddingTop: TRAY_FOOTER_PADDING_TOP,
    paddingBottom: TRAY_FOOTER_PADDING_BOTTOM,
  },
  bodyPinned: {
    paddingHorizontal: TRAY_VERTICAL_PADDING,
  },
  // the content layer spans the sheet and the frame style centers the footer
  bodyInContent: {
    paddingHorizontal: 0,
  },
  contentSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
  },
  exitingSlot: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  // zero height on the anchor, the fill hangs up from the sheet's bottom edge
  backing: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 0,
    overflow: "visible",
  },
  backingFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
