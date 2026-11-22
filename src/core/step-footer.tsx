// Per-step footers.
//
// A step's footer belongs at the bottom of the sheet. It is drawn in one of
// two places:
// - pinned: a layer outside the sheet, fixed to the sheet's bottom edge. A
//   footer stays here while it is shown, while consecutive steps share it
//   (same key: only its children update) and while it leaves (it fades on
//   the spot);
// - in the content: while a new footer comes in with its step, it is drawn
//   inside that step's content layer, just below the content. It then moves,
//   scales, fades and is clipped exactly like the content it belongs to,
//   because it is part of it. When the step change completes the content's
//   bottom edge is the footer's pinned place, and the footer moves to the
//   pinned layer in one commit (it looks the same in both places).
// The sheet reserves the footer's height by reporting it with the content
// height (see TraySheetSurface).
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedReaction,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { TrayRevealedStepContent } from "../tray-step-content";
import { useTrayTransitionStart } from "./transition-start";
import {
  BORDER_RADIUS,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_VERTICAL_PADDING,
} from "./constants/sheet";

// Shared between the footer (writer) and the sheet (reader). The footer is
// measured before the sheet measures the new content in a step-change commit
// (the pinned layer renders before the sheet; an in-content footer is a
// child of the content region), so the step's height includes it.
export type TrayStepFooterMetrics = {
  // height of the current step's footer (0 when the step has none)
  heightRef: { current: number };
  height: SharedValue<number>;
  // set by the sheet: re-report the content height after the footer alone
  // changed size (no step change, so no content commit will do it)
  remeasureContentRef: { current: (() => void) | null };
};

export const TrayStepFooterMetricsContext =
  React.createContext<TrayStepFooterMetrics | null>(null);

// The footer content frame style of the shell (sheet grid width).
export const TrayStepFooterFrameStyleContext = React.createContext<
  React.ComponentProps<typeof Animated.View>["style"]
>(undefined);

// The pinned footer layer element, provided by the presenter for trays that
// render footers per step.
export const TrayStepFooterRegionContext =
  React.createContext<React.ReactNode>(null);

export type TrayStepFooterPlacement = "pinned" | "content";

export type TrayStepFooterState = {
  key: string | null;
  node: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  placement: TrayStepFooterPlacement;
  // the step whose content layer draws an entering footer
  hostTrayId: string | null;
  // the transition the footer enters with; it is pinned once it completes
  generation: number;
  // pinned after entering in the content: shown at once, no motion
  settled: boolean;
};

export const EMPTY_STEP_FOOTER_STATE: TrayStepFooterState = {
  key: null,
  node: null,
  placement: "pinned",
  hostTrayId: null,
  generation: 0,
  settled: false,
};

export type TrayStepFooterPayload = {
  trayId: string;
  stepFooter?: React.ReactNode;
  stepFooterKey?: string | null;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  isFirstRender: boolean;
  fullScreen: boolean;
  transitionContract: {
    generation: number;
    fullScreenChanged?: boolean;
  } | null;
};

// Where the footer of a newly committed step is drawn.
export const resolveStepFooterState = (
  previous: TrayStepFooterState,
  payload: TrayStepFooterPayload,
): TrayStepFooterState => {
  const key = payload.stepFooterKey ?? null;
  const generation = payload.transitionContract?.generation ?? 0;
  const content = {
    key,
    node: key != null ? payload.stepFooter ?? null : null,
    style: payload.footerStyle,
    className: payload.footerClassName,
    hostTrayId: payload.trayId,
  };

  if (key === previous.key) {
    // the same footer: it stays where it is (an entering footer keeps
    // entering, now with this step, and settles with this transition)
    return {
      ...previous,
      ...content,
      generation:
        previous.placement === "content" ? generation : previous.generation,
    };
  }

  const entersWithContent =
    key != null &&
    generation > 0 &&
    !payload.isFirstRender &&
    // fullscreen content is not laid out in a resizing sheet: fade in place
    !payload.fullScreen &&
    payload.transitionContract?.fullScreenChanged !== true;

  return {
    ...content,
    placement: entersWithContent ? "content" : "pinned",
    generation,
    settled: false,
  };
};

const areStepFooterStatesEqual = (
  left: TrayStepFooterState,
  right: TrayStepFooterState,
) =>
  left.key === right.key &&
  left.node === right.node &&
  left.style === right.style &&
  left.className === right.className &&
  left.placement === right.placement &&
  left.hostTrayId === right.hostTrayId &&
  left.generation === right.generation &&
  left.settled === right.settled;

export type TrayStepFooterStore = {
  getSnapshot: () => TrayStepFooterState;
  subscribe: (listener: () => void) => () => void;
  // a step was committed: place its footer
  commit: (payload: TrayStepFooterPayload) => void;
  // the transition an entering footer came in with completed: pin it
  settle: (generation: number) => void;
};

export const createStepFooterStore = (): TrayStepFooterStore => {
  let state = EMPTY_STEP_FOOTER_STATE;
  const listeners = new Set<() => void>();
  const set = (next: TrayStepFooterState) => {
    if (areStepFooterStatesEqual(state, next)) {
      return;
    }

    state = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    commit: (payload) => set(resolveStepFooterState(state, payload)),
    settle: (generation) => {
      if (state.placement === "content" && state.generation === generation) {
        set({ ...state, placement: "pinned", settled: true });
      }
    },
  };
};

export const TrayStepFooterStoreContext =
  React.createContext<TrayStepFooterStore | null>(null);

const useStepFooterState = () => {
  const store = useContext(TrayStepFooterStoreContext);
  const subscribe = useCallback(
    (listener: () => void) => store?.subscribe(listener) ?? (() => {}),
    [store],
  );
  const getSnapshot = useCallback(
    () => store?.getSnapshot() ?? EMPTY_STEP_FOOTER_STATE,
    [store],
  );

  return {
    store,
    state: useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
  };
};

type MeasurableNode = {
  measure?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

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

// The footer itself, the same in either place. It reports its height in the
// commit that shows it (Fabric measure() in a layout effect reads that
// commit's layout), and again whenever it resizes on its own.
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
    const node = nodeRef.current as unknown as MeasurableNode | null;

    node?.measure?.((_x, _y, _width, height) => {
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

// Drawn inside a step's content layer, just below the content, while that
// step's footer enters. Every content layer renders one; only the host draws.
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

// The pinned footer layer.
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

  // a step without a footer releases the reserve (runs before the sheet
  // measures the new content)
  useLayoutEffect(() => {
    if (state.key == null) {
      report(0);
    }
  }, [report, state.key]);

  useEffect(
    () => () => {
      // the layer left (host reused for another tray): release the reserve
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
      // shown at once when it arrives from the content (same place, same
      // look) or with the opening tray; otherwise it fades in place
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
  // the content layer spans the sheet; the frame style centers the footer
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
