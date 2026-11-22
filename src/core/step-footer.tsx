// per-step footers live pinned to the sheet's bottom edge, an entering footer renders inside its step's content until the step change completes and then moves to the pinned layer in one commit
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { measureTrayNode } from "./measure-node";
import { TrayRevealedStepContent } from "../tray-step-content";
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
} from "./step-footer/contexts";
import {
  useStepFooterState,
  type TrayStepFooterState,
} from "./step-footer/placement-store";
export {
  EMPTY_STEP_FOOTER_STATE,
  resolveStepFooterState,
  createStepFooterStore,
  TrayStepFooterStoreContext,
} from "./step-footer/placement-store";
export type {
  TrayStepFooterPlacement,
  TrayStepFooterState,
  TrayStepFooterPayload,
  TrayStepFooterStore,
} from "./step-footer/placement-store";
export {
  TrayStepFooterMetricsContext,
  TrayStepFooterFrameStyleContext,
  TrayStepFooterRegionContext,
} from "./step-footer/contexts";
export type { TrayStepFooterMetrics } from "./step-footer/contexts";

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
const TrayStepFooterBody = ({
  state,
  inContent,
}: {
  state: TrayStepFooterState;
  inContent: boolean;
}) => {
  const metrics = useContext(TrayStepFooterMetricsContext);
  const frameStyle = useContext(TrayStepFooterFrameStyleContext);
  const report = useFooterReport();
  const nodeRef = useRef<View>(null);
  const keyRef = useRef(state.key);
  keyRef.current = state.key;

  useLayoutEffect(() => {
    measureTrayNode(nodeRef.current, (_x, _y, _width, height) => {
      if (height > 0) {
        report(height);
      }
    });
  }, [report, state.key, state.node]);

  const key = state.key;
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (key !== keyRef.current) {
        return;
      }

      if (report(event.nativeEvent.layout.height)) {
        metrics?.remeasureContentRef.current?.();
      }
    },
    [key, metrics, report],
  );

  return (
    <View
      ref={nodeRef}
      collapsable={false}
      onLayout={handleLayout}
      className={state.className}
      style={[
        styles.body,
        inContent ? styles.bodyInContent : styles.bodyPinned,
        state.style,
      ]}
      pointerEvents="box-none"
    >
      <Animated.View style={frameStyle}>{state.node}</Animated.View>
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
  const pendingGeneration =
    state.placement === "content" ? state.generation : 0;

  // a step without a footer releases the reserve before the sheet measures the new content
  useLayoutEffect(() => {
    if (state.key == null) {
      report(0);
    }
  }, [report, state.key]);

  useEffect(
    () => () => {
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
      fullScreenBoundaryExit={fullScreenBoundaryExit}
      pointerEvents="box-none"
    >
      <TrayStepFooterBody state={state} inContent={false} />
    </TrayRevealedStepContent>
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
});
