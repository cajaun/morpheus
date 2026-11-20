import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useProfiledTrayLayoutEffect } from "../telemetry/tray-layout-effect-profiler";
import {
  Animated as RNAnimated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import {
  TrayContentCommitContext,
  TrayContentCommitTargetContext,
  type TrayContentCommitTarget,
} from "./tray-content-commit";
import Animated, {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { GestureDetector } from "react-native-gesture-handler";
import {
  KeyboardController,
  useGenericKeyboardHandler,
  useKeyboardAnimation,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backdrop } from "../primitives/backdrop";
import { useTrayBackgroundScale } from "../runtime/tray-background-scale";
import { createTrayLayoutTransition } from "./animation/tray-layout";
import {
  TrayParentTransitionProvider,
  type TrayParentTransition,
} from "../runtime/tray-parent-transition";
import { styles as trayStyles } from "./animation/tray-styles";
import { TrayOriginProgressProvider } from "./tray-origin-progress";
import {
  isTrayInstrumentationEnabled,
  TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED,
} from "../telemetry/config";
import { logTrayProfilerCommit } from "../telemetry/tray-profiler";
import { recordTrayTelemetry } from "../telemetry/tray-telemetry-buffer";
import { markTrayBoundarySnapshotCommitted } from "../telemetry/tray-boundary-timing";
import {
  markTrayStepKeyboardGate,
  markTrayStepRenderedCommit,
} from "../telemetry/tray-step-timing";
import { TrayMorphProgressProvider } from "./tray-morph-progress";
import {
  openTrayKeyboardGate,
  TrayTransitionStartProvider,
  type TrayKeyboardGate,
  type TrayTransitionStart,
} from "./transition-start";
import {
  resolveTrayContentMotionDirection,
  TrayContentMotionDirectionProvider,
} from "./transition-motion-direction";
import { useTrayAnimatedStyles } from "./animation/use-tray-animated-styles";
import {
  useTraySheetAnimatedStyles,
} from "./animation/use-tray-sheet-animated-styles";
import { useTrayBoundaryMotionState } from "./animation/use-tray-boundary-motion-state";
import { useTrayGesture } from "./input/use-tray-gesture";
import { useSheetTrayKeyboard } from "./input/use-tray-keyboard";
import { resolveKeyboardSheetTransitionIntent } from "./input/keyboard-transition";
import type { TrayController } from "./use-tray-controller";
import {
  useTrayRenderSnapshot,
  useTrayRenderSnapshotRegion,
  type TrayRenderSnapshotStore,
} from "./controller/use-tray-render-state";
import {
  isSheetFrameForTransition,
  resolveTransitionEndpointKey,
} from "./controller/tray-sheet-frame";
import { describeTrayTransition } from "./diagnostics/tray-transition-diagnostics";
import { isTrayDebugLoggingEnabled, log } from "./logger";
import {
  ABSOLUTE_FILL,
  TRAY_HEADER_HORIZONTAL_PADDING,
  TRAY_KEYBOARD_GAP,
} from "./constants";
import type { RenderedTrayState, TrayProps } from "./types";

type TrayVisualViewProps = Pick<
  TrayProps,
  | "assignmentId"
  | "prepared"
  | "style"
  | "rootTrayId"
  | "trayId"
  | "keyboardStickyCapable"
  | "fullScreenMotionCapable"
  | "fullScreen"
  | "dismissible"
  | "transition"
  | "transitionContract"
  | "visible"
  | "interactive"
  | "keyboardAware"
> & {
  isSurfaceReady: boolean;
  fullScreenDraggable: boolean;
  shared: Pick<
    TrayController["shared"],
    | "translateY"
    | "contentHeight"
    | "footerHeight"
    | "context"
    | "hasFooter"
    | "surfaceOpacity"
    | "totalHeight"
    | "progress"
    | "originProgress"
    | "originTargetContentHeight"
    | "morphProgress"
    | "transitionGenerationValue"
    | "fullScreenChangedValue"
    | "transitionStartedAt"
    | "transitionStartedGeneration"
    | "transitionLayoutStartedGeneration"
    | "transitionCompletedGeneration"
  >;
  state: Pick<
    TrayController["state"],
    | "layoutEnabled"
    | "contentHeightSnapshot"
    | "preparedSheetFrame"
    | "renderedHeader"
    | "renderedFooter"
    | "renderedContent"
    | "renderedTrayId"
    | "renderedFullScreen"
    | "renderedFullScreenBackgroundScale"
    | "frameFullScreen"
    | "renderedFullScreenSafeAreaTop"
    | "renderedContainerStyle"
    | "renderedClassName"
    | "renderedFooterStyle"
    | "renderedFooterClassName"
  >;
  renderSnapshotStore?: TrayRenderSnapshotStore;
  renderSnapshotOverride?: RenderedTrayState;
  handlers: TrayController["handlers"];
};

type TrayVisualShellProps = Omit<
  TrayVisualViewProps,
  | "isSurfaceReady"
  | "fullScreenDraggable"
  | "keyboardAware"
  | "interactive"
  | "dismissible"
  | "handlers"
> & {
  handlers: Omit<TrayController["handlers"], "handleRequestClose">;
  interactionStateRef: { current: boolean };
};

type TrayFooterInteraction = {
  interactive: boolean;
  isSurfaceReady: boolean;
};

type TrayBackdropInteraction = {
  interactive: boolean;
  onRequestClose: () => void;
};

// The snapshot store updates arbitrary step nodes through their own region
// subscriptions. When its region topology is unchanged, those node identities
// are not inputs to the shell's animation and geometry policy.
const areTrayVisualShellStatesEqual = (
  previous: TrayVisualShellProps["state"],
  next: TrayVisualShellProps["state"],
  hasSnapshotStore: boolean,
) =>
  previous.layoutEnabled === next.layoutEnabled &&
  previous.contentHeightSnapshot === next.contentHeightSnapshot &&
  previous.preparedSheetFrame === next.preparedSheetFrame &&
  (hasSnapshotStore
    ? Boolean(previous.renderedHeader) === Boolean(next.renderedHeader) &&
      Boolean(previous.renderedContent) === Boolean(next.renderedContent) &&
      Boolean(previous.renderedFooter) === Boolean(next.renderedFooter) &&
      (previous.renderedHeader != null) === (next.renderedHeader != null) &&
      (previous.renderedContent != null) === (next.renderedContent != null) &&
      (previous.renderedFooter != null) === (next.renderedFooter != null)
    : previous.renderedHeader === next.renderedHeader &&
      previous.renderedContent === next.renderedContent &&
      previous.renderedFooter === next.renderedFooter) &&
  previous.renderedTrayId === next.renderedTrayId &&
  previous.renderedFullScreen === next.renderedFullScreen &&
  previous.renderedFullScreenBackgroundScale ===
    next.renderedFullScreenBackgroundScale &&
  previous.frameFullScreen === next.frameFullScreen &&
  previous.renderedFullScreenSafeAreaTop ===
    next.renderedFullScreenSafeAreaTop &&
  previous.renderedContainerStyle === next.renderedContainerStyle &&
  previous.renderedClassName === next.renderedClassName &&
  previous.renderedFooterStyle === next.renderedFooterStyle &&
  previous.renderedFooterClassName === next.renderedFooterClassName;

const areTrayVisualShellPropsEqual = (
  previous: TrayVisualShellProps,
  next: TrayVisualShellProps,
) =>
  previous.assignmentId === next.assignmentId &&
  previous.prepared === next.prepared &&
  previous.style === next.style &&
  previous.rootTrayId === next.rootTrayId &&
  previous.trayId === next.trayId &&
  previous.keyboardStickyCapable === next.keyboardStickyCapable &&
  previous.fullScreenMotionCapable === next.fullScreenMotionCapable &&
  previous.fullScreen === next.fullScreen &&
  previous.transition === next.transition &&
  previous.transitionContract === next.transitionContract &&
  previous.visible === next.visible &&
  previous.shared === next.shared &&
  previous.renderSnapshotStore === next.renderSnapshotStore &&
  previous.renderSnapshotOverride === next.renderSnapshotOverride &&
  previous.handlers === next.handlers &&
  previous.interactionStateRef === next.interactionStateRef &&
  areTrayVisualShellStatesEqual(
    previous.state,
    next.state,
    previous.renderSnapshotStore !== undefined,
  );

const TrayGestureContext = React.createContext<
  ReturnType<typeof useTrayGesture> | undefined
>(undefined);
const TrayFooterInteractionContext = React.createContext<
  TrayFooterInteraction | undefined
>(undefined);
const TrayBackdropInteractionContext = React.createContext<
  TrayBackdropInteraction | undefined
>(undefined);
const TrayKeyboardStickyContext = React.createContext(false);
// Present only under a keyboard-capable tray. The shell layout transition
// waits on it for sheet steps that bring up or put away the keyboard.
const TrayKeyboardGateContext = React.createContext<TrayKeyboardGate | null>(
  null,
);

// Per-step transition values. They change on every step, but only a few
// leaves consume them: the sheet view that carries the layout transition and
// the content wrappers that read the transition clock. Providing them from
// TrayVisualShell (which renders for every step anyway) lets React deliver
// them to those leaves in the same render and commit, while the memoized
// surface components in between skip. Timing is unchanged: same values,
// same commit as when they travelled as props.
type TrayShellTransitionValue = {
  contentMotionDirection: ReturnType<typeof resolveTrayContentMotionDirection>;
  trayTransitionStart: TrayTransitionStart;
  layoutAnimationConfig: ReturnType<typeof createTrayLayoutTransition>;
};

const TrayShellTransitionContext =
  React.createContext<TrayShellTransitionValue | null>(null);

// Sheet-only frame values. presentationFrameStyle applies and releases the
// height lock on step revisits and renderedClassName carries a step's own
// sheet class. Only the sheet view reads them, so they bypass the memoized
// surface the same way, landing in the same commit as before.
type TraySheetFrameValue = {
  presentationFrameStyle: React.ComponentProps<typeof Animated.View>["style"];
  renderedClassName?: string;
};

const TraySheetFrameContext = React.createContext<TraySheetFrameValue | null>(
  null,
);

const TraySheetFrameProvider = ({
  presentationFrameStyle,
  renderedClassName,
  children,
}: TraySheetFrameValue & { children: React.ReactNode }) => {
  const value = useMemo(
    () => ({ presentationFrameStyle, renderedClassName }),
    [presentationFrameStyle, renderedClassName],
  );

  return (
    <TraySheetFrameContext.Provider value={value}>
      {children}
    </TraySheetFrameContext.Provider>
  );
};

// Layout handlers close over per-step state (rendered tray id, measurement
// owner, transition contract), so their identities change on every step and
// would force the memoized surface to re-render. Native layout events always
// arrive after the commit that rendered them, so calling the latest handler
// through a stable wrapper is behaviourally identical.
const useStableLayoutHandler = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result,
) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  return useCallback((...args: Args) => handlerRef.current(...args), []);
};
const NOOP_TRAY_CLOSE = () => {};

const TrayInteractionBackdrop = React.memo(
  ({
    isRendered,
    progress,
  }: {
    isRendered: boolean;
    progress: TrayController["shared"]["progress"];
  }) => {
    const interaction = React.useContext(TrayBackdropInteractionContext)!;

    return (
      <Backdrop
        onTap={interaction.onRequestClose}
        isRendered={isRendered}
        interactive={interaction.interactive}
        progress={progress}
      />
    );
  },
);

TrayInteractionBackdrop.displayName = "TrayInteractionBackdrop";

const TrayOriginTransitionBackdrop = React.memo(
  ({
    isRendered,
    originProgress,
    progress,
  }: {
    isRendered: boolean;
    originProgress: TrayController["shared"]["originProgress"];
    progress: TrayController["shared"]["progress"];
  }) => {
    const backdropProgress = useDerivedValue(
      () => originProgress.value * progress.value,
    );

    return (
      <TrayInteractionBackdrop
        isRendered={isRendered}
        progress={backdropProgress}
      />
    );
  },
);

TrayOriginTransitionBackdrop.displayName = "TrayOriginTransitionBackdrop";

const TrayKeyboardStickyAnimatedRegion = React.memo(
  ({ enabled, children }: { enabled: boolean; children: React.ReactNode }) => {
    const keyboardStickyEnabled = React.useContext(TrayKeyboardStickyContext);
    const { height, progress } = useKeyboardAnimation();
    const isEnabled = enabled && keyboardStickyEnabled;

    // KeyboardStickyView recreates this interpolation on every React render.
    // Keep the same native Animated graph while its source value is stable.
    const keyboardOffset = useMemo(
      () =>
        progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, TRAY_KEYBOARD_GAP],
        }),
      [progress],
    );
    const stickyStyle = useMemo(() => {
      const disabledOffset = RNAnimated.add(
        RNAnimated.multiply(height, 0),
        0,
      );
      const enabledOffset = RNAnimated.add(height, keyboardOffset);

      return {
        transform: [
          { translateY: isEnabled ? enabledOffset : disabledOffset },
        ],
      };
    }, [height, isEnabled, keyboardOffset]);
    const styles = useMemo(
      () => [stickyStyle, ABSOLUTE_FILL],
      [stickyStyle],
    );

    return (
      <RNAnimated.View pointerEvents="box-none" style={styles}>
        {children}
      </RNAnimated.View>
    );
  },
);

TrayKeyboardStickyAnimatedRegion.displayName =
  "TrayKeyboardStickyAnimatedRegion";

const TrayKeyboardStickyRegion = React.memo(
  ({
    capable,
    enabled,
    children,
  }: {
    capable: boolean;
    enabled: boolean;
    children: React.ReactNode;
  }) =>
    // No registered step can move with the keyboard. Keep the same fill
    // geometry without subscribing to the keyboard animation clock.
    capable ? (
      <TrayKeyboardStickyAnimatedRegion enabled={enabled}>
        {children}
      </TrayKeyboardStickyAnimatedRegion>
    ) : (
      <View pointerEvents="box-none" style={ABSOLUTE_FILL}>
        {children}
      </View>
    ),
);

TrayKeyboardStickyRegion.displayName = "TrayKeyboardStickyRegion";

type TrayAnimatedStyles = ReturnType<
  typeof useTrayAnimatedStyles
>;

type TrayBoundaryStyles = ReturnType<typeof useTrayBoundaryMotionState>;
type TrayBoundaryMotionParams = Omit<
  Parameters<typeof useTrayBoundaryMotionState>[0],
  "safeAreaTopInset" | "backgroundScale"
>;

const TrayBoundaryMotionController = ({
  params,
  animatedStyleParams,
  prepared,
  children,
}: {
  params: TrayBoundaryMotionParams;
  animatedStyleParams: Parameters<typeof useTrayAnimatedStyles>[0];
  prepared: boolean;
  children: (
    styles: TrayBoundaryStyles,
    animatedStyles: TrayAnimatedStyles,
  ) => React.ReactNode;
}) => {
  const {
    top: safeAreaTopInset,
    bottom: safeAreaBottomInset,
  } = useSafeAreaInsets();
  const animatedStyles = useTrayAnimatedStyles(
    animatedStyleParams,
    safeAreaBottomInset,
  );
  const providerBackgroundScale = useTrayBackgroundScale();
  const fallbackBackgroundScale = useSharedValue(1);
  // A prepared hidden host must not publish its baseline into the visible
  // tray's shared scale. It switches to the provider value on activation.
  const backgroundScale =
    !prepared && providerBackgroundScale
      ? providerBackgroundScale
      : fallbackBackgroundScale;
  const styles = useTrayBoundaryMotionState({
    ...params,
    safeAreaTopInset,
    backgroundScale,
  });
  return children(styles, animatedStyles);
};

TrayBoundaryMotionController.displayName = "TrayBoundaryMotionController";

const TraySheetAnimatedStyleController = ({
  params,
  children,
}: {
  params: Parameters<typeof useTrayAnimatedStyles>[0];
  children: (styles: TrayAnimatedStyles) => React.ReactNode;
}) => children(useTraySheetAnimatedStyles(params));

TraySheetAnimatedStyleController.displayName =
  "TraySheetAnimatedStyleController";

// Fullscreen-capable registrations keep this motion system mounted across
// step changes. Trigger-origin and active fullscreen endpoints also retain it
// even when the registration itself is otherwise sheet-only.
const TrayBoundaryMotionRegion = ({
  enabled,
  params,
  animatedStyleParams,
  prepared,
  children,
}: {
  enabled: boolean;
  params: TrayBoundaryMotionParams;
  animatedStyleParams: Parameters<typeof useTrayAnimatedStyles>[0];
  prepared: boolean;
  children: (
    boundaryStyles: TrayBoundaryStyles | null,
    animatedStyles: TrayAnimatedStyles,
  ) => React.ReactNode;
}) =>
  enabled ? (
    <TrayBoundaryMotionController
      params={params}
      animatedStyleParams={animatedStyleParams}
      prepared={prepared}
    >
      {children}
    </TrayBoundaryMotionController>
  ) : (
    <TraySheetAnimatedStyleController params={animatedStyleParams}>
      {(animatedStyles) => children(null, animatedStyles)}
    </TraySheetAnimatedStyleController>
  );

TrayBoundaryMotionRegion.displayName = "TrayBoundaryMotionRegion";

type TraySurfaceProps = Pick<
  TrayAnimatedStyles,
  | "contentBoundarySourceStyle"
  | "contentBoundarySourceViewportStyle"
  | "contentFrameStyle"
  | "contentPaddingStyle"
  | "contentRevealStyle"
  | "contentViewportStyle"
  | "dragStyle"
  | "footerContainerStyle"
  | "footerContentFrameStyle"
  | "footerSpacerStyle"
  | "footerVisibilityStyle"
  | "headerFrameStyle"
  | "surfaceVisibilityStyle"
  | "originSurfaceVisibilityStyle"
  | "trayLayoutStyle"
> &
  Partial<Pick<TrayBoundaryStyles, "fullScreenSafeAreaContentStyle">> &
  Pick<
    TrayController["handlers"],
    | "handleContentLayout"
    | "handleVisibleFooterLayout"
    | "handleShellLayout"
  > & {
    hasFooter: TrayController["shared"]["hasFooter"];
    style?: TrayProps["style"];
    renderedContainerStyle?: TrayProps["containerStyle"];
    renderedHeader: React.ReactNode;
    renderedContent: React.ReactNode;
    renderedFooter: React.ReactNode;
    renderedFooterClassName?: string;
    renderedFooterStyle?: TrayProps["footerStyle"];
    renderSnapshotStore?: TrayRenderSnapshotStore;
    renderedFullScreen: boolean;
    originProgress: TrayController["shared"]["originProgress"];
    instrumentationEnabled: boolean;
    shouldUseLayoutAnimation: boolean;
    isFullScreenBoundaryTransition: boolean;
  };

// Keep arbitrary React step nodes behind their own reconciliation boundary.
// The shell still receives every geometry/lifecycle update, but a shell-only
// update does not ask the step's header, body, or footer subtree to reconcile
// when its element identity is unchanged. This preserves the existing
// transition providers and native layout participants.
const TrayRenderedNode = React.memo(
  ({ node }: { node: React.ReactNode }) => <>{node}</>,
);

TrayRenderedNode.displayName = "TrayRenderedNode";

type TraySnapshotRegionName = "header" | "content" | "footer";

// Read one payload region without subscribing the native surface to the full
// snapshot. A changing footer/body can therefore reconcile locally while the
// animated shell stays mounted.
const TraySnapshotRegion = React.memo(
  ({
    store,
    region,
  }: {
    store: TrayRenderSnapshotStore;
    region: TraySnapshotRegionName;
  }) => {
    const node = useTrayRenderSnapshotRegion(store, region);
    const notifyContentCommitted = React.useContext(TrayContentCommitContext);
    const notifyRef = useRef(notifyContentCommitted);
    notifyRef.current = notifyContentCommitted;

    // a swapped content node is measured in the commit that mounts it
    useLayoutEffect(() => {
      if (region === "content" && node != null) {
        notifyRef.current?.(store.getSnapshot().transitionContract?.generation);
      }
    }, [node, region, store]);

    return <TrayRenderedNode node={node} />;
  },
);

TraySnapshotRegion.displayName = "TraySnapshotRegion";

const EMPTY_RENDERED_TRAY_STATE: RenderedTrayState = {
  header: null,
  content: null,
  footer: null,
  trayId: undefined,
  transitionContract: null,
};

const EMPTY_RENDER_SNAPSHOT_STORE: TrayRenderSnapshotStore = {
  getSnapshot: () => EMPTY_RENDERED_TRAY_STATE,
  subscribe: () => () => {},
  publish: () => {},
};

// Snapshot publications update telemetry and region payloads. They must not
// force the native animated surface to reconcile when only a step node changed.
const TraySnapshotTelemetry = React.memo(
  ({
    store,
    override,
    rootTrayId,
    visible,
  }: {
    store?: TrayRenderSnapshotStore;
    override?: RenderedTrayState;
    rootTrayId?: string;
    visible: boolean;
  }) => {
    const committedSnapshot = useTrayRenderSnapshot(
      store ?? EMPTY_RENDER_SNAPSHOT_STORE,
    );
    const snapshot = override ?? committedSnapshot;

    useProfiledTrayLayoutEffect("TraySnapshotTelemetry.commitSnapshot", () => {
      if (!visible || snapshot.trayId === undefined) {
        return;
      }

      markTrayBoundarySnapshotCommitted(
        rootTrayId,
        snapshot.transitionContract,
        snapshot.trayId,
      );
      markTrayStepRenderedCommit(
        rootTrayId,
        snapshot.trayId,
        snapshot.transitionContract?.generation,
      );
    }, [rootTrayId, snapshot, visible]);

    return null;
  },
);

TraySnapshotTelemetry.displayName = "TraySnapshotTelemetry";

// Keep the native surface and its content reconciliation behind a second
// boundary. Reanimated shared values continue to update the same animated
// styles on the UI thread; this only skips React work when a controller update
// does not change anything consumed by this surface.
const recordChangedSurfaceProps = (
  previous: TraySurfaceProps,
  next: TraySurfaceProps,
) => {
  const previousProps = previous as unknown as Record<string, unknown>;
  const nextProps = next as unknown as Record<string, unknown>;
  const changed = Object.keys(nextProps).filter(
    (key) => previousProps[key] !== nextProps[key],
  );

  if (changed.length > 0) {
    recordTrayTelemetry("TraySurfacePropsChanged", { changed });
  }
};

const areTraySurfacePropsEqual = (
  previous: TraySurfaceProps,
  next: TraySurfaceProps,
) => {
  if (next.instrumentationEnabled) {
    // diagnostic only: names the props that defeat this memo boundary
    recordChangedSurfaceProps(previous, next);
  }

  const hasSameRegionShape =
    (previous.renderedHeader != null) === (next.renderedHeader != null) &&
    (previous.renderedContent != null) === (next.renderedContent != null) &&
    (previous.renderedFooter != null) === (next.renderedFooter != null);

  if (
    !hasSameRegionShape ||
    previous.renderSnapshotStore !== next.renderSnapshotStore
  ) {
    return false;
  }

  if (previous.renderSnapshotStore == null) {
    if (
      previous.renderedHeader !== next.renderedHeader ||
      previous.renderedContent !== next.renderedContent ||
      previous.renderedFooter !== next.renderedFooter
    ) {
      return false;
    }
  }

  return (
    previous.hasFooter === next.hasFooter &&
    previous.style === next.style &&
    previous.renderedContainerStyle === next.renderedContainerStyle &&
    previous.renderedFooterClassName === next.renderedFooterClassName &&
    previous.renderedFooterStyle === next.renderedFooterStyle &&
    previous.renderedFullScreen === next.renderedFullScreen &&
    previous.instrumentationEnabled === next.instrumentationEnabled &&
    previous.shouldUseLayoutAnimation === next.shouldUseLayoutAnimation &&
    previous.isFullScreenBoundaryTransition ===
      next.isFullScreenBoundaryTransition &&
    previous.handleContentLayout === next.handleContentLayout &&
    previous.handleVisibleFooterLayout === next.handleVisibleFooterLayout &&
    previous.handleShellLayout === next.handleShellLayout &&
    previous.footerSpacerStyle === next.footerSpacerStyle &&
    previous.contentBoundarySourceStyle === next.contentBoundarySourceStyle &&
    previous.contentBoundarySourceViewportStyle ===
      next.contentBoundarySourceViewportStyle &&
    previous.contentFrameStyle === next.contentFrameStyle &&
    previous.contentPaddingStyle === next.contentPaddingStyle &&
    previous.contentRevealStyle === next.contentRevealStyle &&
    previous.contentViewportStyle === next.contentViewportStyle &&
    previous.headerFrameStyle === next.headerFrameStyle &&
    previous.trayLayoutStyle === next.trayLayoutStyle &&
    previous.footerContainerStyle === next.footerContainerStyle &&
    previous.dragStyle === next.dragStyle &&
    previous.surfaceVisibilityStyle === next.surfaceVisibilityStyle &&
    previous.originSurfaceVisibilityStyle ===
      next.originSurfaceVisibilityStyle &&
    previous.footerVisibilityStyle === next.footerVisibilityStyle &&
    previous.footerContentFrameStyle === next.footerContentFrameStyle &&
    previous.fullScreenSafeAreaContentStyle ===
      next.fullScreenSafeAreaContentStyle &&
    previous.originProgress === next.originProgress
  );
};

const TrayGestureRegion = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const gesture = React.useContext(TrayGestureContext)!;

    return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
  },
);

TrayGestureRegion.displayName = "TrayGestureRegion";

const TrayFooterSurface = React.memo(
  ({
    className,
    hasFooter,
    onLayout,
    style,
    children,
  }: {
    className?: string;
    hasFooter: boolean;
    onLayout: TraySurfaceProps["handleVisibleFooterLayout"];
    style: React.ComponentProps<typeof Animated.View>["style"];
    children: React.ReactNode;
  }) => {
    const interaction = React.useContext(TrayFooterInteractionContext)!;

    return (
      <Animated.View
        className={className}
        onLayout={onLayout}
        style={style}
        pointerEvents={
          hasFooter && interaction.interactive && interaction.isSurfaceReady
            ? "auto"
            : "none"
        }
      >
        {children}
      </Animated.View>
    );
  },
);

TrayFooterSurface.displayName = "TrayFooterSurface";

type TraySheetSurfaceProps = Pick<
  TraySurfaceProps,
  | "style"
  | "renderedContainerStyle"
  | "renderedHeader"
  | "renderedContent"
  | "renderSnapshotStore"
  | "renderedFullScreen"
  | "instrumentationEnabled"
  | "shouldUseLayoutAnimation"
  | "isFullScreenBoundaryTransition"
  | "handleContentLayout"
  | "handleShellLayout"
  | "footerSpacerStyle"
  | "contentBoundarySourceStyle"
  | "contentBoundarySourceViewportStyle"
  | "contentFrameStyle"
  | "contentPaddingStyle"
  | "contentRevealStyle"
  | "contentViewportStyle"
  | "headerFrameStyle"
  | "trayLayoutStyle"
  | "dragStyle"
  | "surfaceVisibilityStyle"
  | "originSurfaceVisibilityStyle"
  | "fullScreenSafeAreaContentStyle"
> & {
  hasHeader: boolean;
};

// Keep the gesture-bound animated sheet isolated from footer-only and other
// surface updates. Its shallow props are the inputs that can affect the sheet;
// stable inputs let React skip rerendering Reanimated's Animated.View wrapper.
// Re-provide the per-step transition values at their original position in
// the tree (around the step header/content only, not the footer).
const TrayStepTransitionProviders = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const value = React.useContext(TrayShellTransitionContext);
  const trayTransitionStart = value?.trayTransitionStart;
  const parentTransition = useMemo<TrayParentTransition | null>(
    () =>
      trayTransitionStart
        ? {
            // only transitions with a shell participant complete their
            // generation; anything else has nothing to wait for
            generation: trayTransitionStart.layoutStartRequired
              ? trayTransitionStart.generation
              : 0,
            completedGeneration: trayTransitionStart.completedGeneration,
          }
        : null,
    [trayTransitionStart],
  );

  if (!value) {
    return <>{children}</>;
  }

  return (
    <TrayContentMotionDirectionProvider value={value.contentMotionDirection}>
      <TrayTransitionStartProvider value={value.trayTransitionStart}>
        <TrayParentTransitionProvider value={parentTransition}>
          {children}
        </TrayParentTransitionProvider>
      </TrayTransitionStartProvider>
    </TrayContentMotionDirectionProvider>
  );
};

TrayStepTransitionProviders.displayName = "TrayStepTransitionProviders";

// The sheet view that carries the layout transition. It reads the per-step
// layout config and whether to apply it from context, so a new config or a
// flip of the flag re-renders only this view, not the sheet body.
const TraySheetLayoutAnimationContext = React.createContext(false);

const TraySheetLayoutView = ({
  leadingStyle,
  trailingStyle,
  children,
  ...viewProps
}: Omit<
  React.ComponentProps<typeof Animated.View>,
  "layout" | "style" | "className"
> & {
  leadingStyle: React.ComponentProps<typeof Animated.View>["style"];
  trailingStyle: React.ComponentProps<typeof Animated.View>["style"];
  children: React.ReactNode;
}) => {
  const value = React.useContext(TrayShellTransitionContext);
  const frame = React.useContext(TraySheetFrameContext);
  const shouldUseLayoutAnimation = React.useContext(
    TraySheetLayoutAnimationContext,
  );
  const presentationFrameStyle = frame?.presentationFrameStyle;
  // same order as before: container, layout, frame, then container/visibility
  const style = useMemo(
    () => [leadingStyle, presentationFrameStyle, trailingStyle],
    [leadingStyle, presentationFrameStyle, trailingStyle],
  );

  return (
    <Animated.View
      {...viewProps}
      className={frame?.renderedClassName}
      style={style}
      layout={
        shouldUseLayoutAnimation ? value?.layoutAnimationConfig : undefined
      }
    >
      {children}
    </Animated.View>
  );
};

TraySheetLayoutView.displayName = "TraySheetLayoutView";

const TraySheetSurface = React.memo(
  ({
    style,
    renderedContainerStyle,
    renderedHeader,
    renderedContent,
    renderSnapshotStore,
    renderedFullScreen,
    instrumentationEnabled,
    shouldUseLayoutAnimation,
    isFullScreenBoundaryTransition,
    handleContentLayout,
    handleShellLayout,
    footerSpacerStyle,
    contentBoundarySourceStyle,
    contentBoundarySourceViewportStyle,
    contentFrameStyle,
    contentPaddingStyle,
    contentRevealStyle,
    contentViewportStyle: contentViewportStyleInput,
    headerFrameStyle,
    trayLayoutStyle,
    dragStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle,
    fullScreenSafeAreaContentStyle,
    hasHeader,
  }: TraySheetSurfaceProps) => {
    // presentationFrameStyle and the sheet class come from context inside
    // TraySheetLayoutView, between these two halves (original order kept)
    const sheetLeadingStyle = useMemo(
      () => [trayStyles.container, trayLayoutStyle],
      [trayLayoutStyle],
    );
    const sheetTrailingStyle = useMemo(
      () => [
        renderedContainerStyle,
        surfaceVisibilityStyle,
        originSurfaceVisibilityStyle,
        dragStyle,
        style,
      ],
      [
        dragStyle,
        originSurfaceVisibilityStyle,
        renderedContainerStyle,
        style,
        surfaceVisibilityStyle,
      ],
    );
    const contentStyle = useMemo(
      () => [
        trayStyles.content,
        // apply the clock aware frame last so target topology wins
        ...(isFullScreenBoundaryTransition
          ? [contentBoundarySourceStyle, contentFrameStyle]
          : [contentFrameStyle]),
        contentRevealStyle,
      ],
      [
        contentBoundarySourceStyle,
        contentFrameStyle,
        contentRevealStyle,
        isFullScreenBoundaryTransition,
      ],
    );
    const contentViewportStyle = useMemo(
      () => [
        contentPaddingStyle,
        contentBoundarySourceViewportStyle,
        contentViewportStyleInput,
        fullScreenSafeAreaContentStyle,
      ],
      [
        contentBoundarySourceViewportStyle,
        contentPaddingStyle,
        contentViewportStyleInput,
        fullScreenSafeAreaContentStyle,
      ],
    );
    const fullScreenContentStyle = useMemo(
      () => (renderedFullScreen ? { flex: 1 } : undefined),
      [renderedFullScreen],
    );
    const headerStyle = useMemo(
      () => [localStyles.headerContainer, headerFrameStyle],
      [headerFrameStyle],
    );
    const contentMeasureRef = useRef<React.ComponentRef<typeof View>>(null);
    const contentOriginRef = useRef({ x: 0, y: 0 });
    const handleContentLayoutRef = useRef(handleContentLayout);
    handleContentLayoutRef.current = handleContentLayout;
    const handleMeasuredContentLayout = useCallback(
      (event: LayoutChangeEvent) => {
        contentOriginRef.current = {
          x: event.nativeEvent.layout.x,
          y: event.nativeEvent.layout.y,
        };
        handleContentLayoutRef.current(event);
      },
      [],
    );
    // Measure committed step content synchronously and feed it through the
    // same guarded path as onLayout. On Fabric, measure() inside a layout
    // effect returns the layout React just committed, so the target height
    // is applied before the frame instead of after a native onLayout round
    // trip. The later onLayout for the same frame is de-duplicated by the
    // measurement signature (same origin, size and owner).
    const commitTarget = React.useContext(TrayContentCommitTargetContext);
    const commitTargetRef = useRef(commitTarget);
    commitTargetRef.current = commitTarget;
    const measureCommittedContent = useCallback((generation?: number) => {
      const target = commitTargetRef.current;

      if (target) {
        // record which transition's content is now mounted; a region that
        // cannot name its generation (raw node content) uses the shell's
        target.committedGeneration.value =
          generation ?? target.shellGenerationRef.current;
      }

      const node = contentMeasureRef.current as unknown as {
        measure?: (
          callback: (
            x: number,
            y: number,
            width: number,
            height: number,
          ) => void,
        ) => void;
      } | null;

      if (
        !TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED ||
        typeof node?.measure !== "function"
      ) {
        return;
      }

      node.measure((_x, _y, width, height) => {
        if (
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          height <= 1
        ) {
          return;
        }

        const { x, y } = contentOriginRef.current;

        handleContentLayoutRef.current({
          nativeEvent: { layout: { x, y, width, height } },
        } as LayoutChangeEvent);
      });
    }, []);

    // Raw-node mode swaps content through this component's props.
    useLayoutEffect(() => {
      if (!renderSnapshotStore && renderedContent != null) {
        measureCommittedContent();
      }
    }, [measureCommittedContent, renderSnapshotStore, renderedContent]);

    // The sheet body only changes with its own inputs. Keeping the element
    // identity stable lets React skip it (and the gesture wrapper) when only
    // the layout-animation flag flips, which happens twice per step change.
    const sheetBody = useMemo(
      () => (
        <Animated.View style={contentStyle}>
          <Animated.View style={contentViewportStyle}>
            <View
              // Measure the content snapshot, not the animated boundary
              // viewport that can retain the previous endpoint's height.
              // The style is static, so a host View (not Animated.View)
              // gives a ref with synchronous Fabric measure().
              ref={contentMeasureRef}
              collapsable={false}
              onLayout={handleMeasuredContentLayout}
              style={fullScreenContentStyle}
            >
              <TrayContentCommitContext.Provider
                value={measureCommittedContent}
              >
                <TrayStepTransitionProviders>
                  {hasHeader ? (
                    <Animated.View style={headerStyle}>
                      {renderSnapshotStore ? (
                        <TraySnapshotRegion
                          store={renderSnapshotStore}
                          region="header"
                        />
                      ) : (
                        <TrayRenderedNode node={renderedHeader} />
                      )}
                    </Animated.View>
                  ) : null}
                  {renderSnapshotStore ? (
                    <TraySnapshotRegion
                      store={renderSnapshotStore}
                      region="content"
                    />
                  ) : (
                    <TrayRenderedNode node={renderedContent} />
                  )}
                </TrayStepTransitionProviders>
              </TrayContentCommitContext.Provider>
            </View>
          </Animated.View>
          {/* reserve footer space the footer itself is absolute and does not participate in content measurement */}
          <Animated.View style={footerSpacerStyle} />
        </Animated.View>
      ),
      [
        contentStyle,
        contentViewportStyle,
        footerSpacerStyle,
        fullScreenContentStyle,
        handleMeasuredContentLayout,
        hasHeader,
        headerStyle,
        measureCommittedContent,
        renderSnapshotStore,
        renderedContent,
        renderedHeader,
      ],
    );
    const sheetTree = useMemo(
      () => (
        <TrayGestureRegion>
          <TraySheetLayoutView
            leadingStyle={sheetLeadingStyle}
            trailingStyle={sheetTrailingStyle}
            onLayout={instrumentationEnabled ? handleShellLayout : undefined}
          >
            {sheetBody}
          </TraySheetLayoutView>
        </TrayGestureRegion>
      ),
      [
        handleShellLayout,
        instrumentationEnabled,
        sheetBody,
        sheetLeadingStyle,
        sheetTrailingStyle,
      ],
    );

    return (
      <TraySheetLayoutAnimationContext.Provider
        value={shouldUseLayoutAnimation}
      >
        {sheetTree}
      </TraySheetLayoutAnimationContext.Provider>
    );
  },
);

TraySheetSurface.displayName = "TraySheetSurface";

const TraySurface = React.memo(
  ({
    hasFooter,
    style,
    renderedContainerStyle,
    renderedHeader,
    renderedContent,
    renderedFooter,
    renderedFooterClassName,
    renderedFooterStyle,
    renderSnapshotStore,
    renderedFullScreen,
    instrumentationEnabled,
    shouldUseLayoutAnimation,
    isFullScreenBoundaryTransition,
    handleContentLayout,
    handleVisibleFooterLayout,
    handleShellLayout,
    footerSpacerStyle,
    contentBoundarySourceStyle,
    contentBoundarySourceViewportStyle,
    contentFrameStyle,
    contentPaddingStyle,
    contentRevealStyle,
    contentViewportStyle,
    headerFrameStyle,
    trayLayoutStyle,
    footerContainerStyle,
    dragStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle,
    footerVisibilityStyle,
    footerContentFrameStyle,
    fullScreenSafeAreaContentStyle,
    originProgress,
  }: TraySurfaceProps) => {
    // The region elements are stable shell slots. Their own subscriptions
    // update step payloads without publishing through this native surface.
    const surfaceContainerStyle = renderedContainerStyle;
    const surfaceFooterClassName = renderedFooterClassName;
    const surfaceFooterStyle = renderedFooterStyle;
    const surfaceHeader = renderedHeader;
    const surfaceContent = renderedContent;
    const surfaceFooter = renderedFooter;

    useProfiledTrayLayoutEffect("TraySurface.syncFooterFlag", () => {
      hasFooter.value = surfaceFooter != null;
    }, [hasFooter, surfaceFooter]);

    // Fixed footers stay outside the layout-animated shell; only a fullscreen
    // boundary may move this layer, and then it follows the shell's explicit
    // morph clock rather than content layout. The layer is built once per
    // footer input so sheet-only updates (the layout-animation flag, boundary
    // styles) skip it entirely.
    const footerLayer = useMemo(
      () => (
        <TrayFooterSurface
          className={surfaceFooterClassName}
          hasFooter={Boolean(surfaceFooter)}
          onLayout={handleVisibleFooterLayout}
          style={[
            trayStyles.footer,
            dragStyle,
            surfaceFooterStyle,
            footerContainerStyle,
            footerVisibilityStyle,
          ]}
        >
          <Animated.View style={footerContentFrameStyle}>
            <TrayOriginProgressProvider value={originProgress}>
              {renderSnapshotStore ? (
                <TraySnapshotRegion
                  store={renderSnapshotStore}
                  region="footer"
                />
              ) : (
                <TrayRenderedNode node={surfaceFooter ?? null} />
              )}
            </TrayOriginProgressProvider>
          </Animated.View>
        </TrayFooterSurface>
      ),
      [
        dragStyle,
        footerContainerStyle,
        footerContentFrameStyle,
        footerVisibilityStyle,
        handleVisibleFooterLayout,
        originProgress,
        renderSnapshotStore,
        surfaceFooter,
        surfaceFooterClassName,
        surfaceFooterStyle,
      ],
    );

    return (
      <>
        <TraySheetSurface
          style={style}
          renderedContainerStyle={surfaceContainerStyle}
          renderedHeader={renderSnapshotStore ? null : surfaceHeader}
          renderedContent={renderSnapshotStore ? null : surfaceContent}
          renderSnapshotStore={renderSnapshotStore}
          renderedFullScreen={renderedFullScreen}
          instrumentationEnabled={instrumentationEnabled}
          shouldUseLayoutAnimation={shouldUseLayoutAnimation}
          isFullScreenBoundaryTransition={isFullScreenBoundaryTransition}
          handleContentLayout={handleContentLayout}
          handleShellLayout={handleShellLayout}
          footerSpacerStyle={footerSpacerStyle}
          contentBoundarySourceStyle={contentBoundarySourceStyle}
          contentBoundarySourceViewportStyle={
            contentBoundarySourceViewportStyle
          }
          contentFrameStyle={contentFrameStyle}
          contentPaddingStyle={contentPaddingStyle}
          contentRevealStyle={contentRevealStyle}
          contentViewportStyle={contentViewportStyle}
          headerFrameStyle={headerFrameStyle}
          trayLayoutStyle={trayLayoutStyle}
          dragStyle={dragStyle}
          surfaceVisibilityStyle={surfaceVisibilityStyle}
          originSurfaceVisibilityStyle={originSurfaceVisibilityStyle}
          fullScreenSafeAreaContentStyle={fullScreenSafeAreaContentStyle}
          hasHeader={surfaceHeader != null}
        />
        {footerLayer}
      </>
    );
  },
  areTraySurfacePropsEqual,
);

TraySurface.displayName = "TraySurface";

type TrayVisualShellContentProps = {
  assignmentId: number;
  rootTrayId: TrayVisualViewProps["rootTrayId"];
  trayIdRef: { current: TrayVisualViewProps["trayId"] };
  visible: TrayVisualViewProps["visible"];
  interactionStateRef: { current: boolean };
  surfaceProps: TraySurfaceProps;
  morphProgress: TrayController["shared"]["morphProgress"];
  progress: TrayController["shared"]["progress"];
  renderedTrayId: TrayVisualViewProps["state"]["renderedTrayId"];
  requiresFullScreenMotion: boolean;
  shouldUseOriginTransition: boolean;
  presentationFullScreen: boolean;
  renderedClassName?: string;
  keyboardStickyCapable: boolean;
  fullScreenSurfaceStyle: React.ComponentProps<typeof Animated.View>["style"];
  fullScreenSurfaceFillStyle: React.ComponentProps<typeof Animated.View>["style"];
  renderSnapshotOverride?: TrayVisualViewProps["renderSnapshotOverride"];
};

// The boundary controller runs on state updates that can leave the actual
// native shell inputs unchanged. Keep construction of the full shell tree
// behind this memo boundary so those updates only rebuild this component's
// small element and compare its stable inputs.
const TrayVisualShellContent = React.memo(
  ({
    assignmentId,
    rootTrayId,
    trayIdRef,
    visible,
    interactionStateRef,
    surfaceProps,
    morphProgress,
    progress,
    renderedTrayId,
    requiresFullScreenMotion,
    shouldUseOriginTransition,
    presentationFullScreen,
    renderedClassName,
    keyboardStickyCapable,
    fullScreenSurfaceStyle,
    fullScreenSurfaceFillStyle,
    renderSnapshotOverride,
  }: TrayVisualShellContentProps) => {
    // The shell is shared by every step; its region id names the host so a
    // step change does not re-render the shell just to rename the profiler.
    const shellId = `tray-region:${rootTrayId ?? assignmentId}:shell`;
    const handleProfileRender = useCallback<React.ProfilerOnRenderCallback>(
      (
        _id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      ) =>
        logTrayProfilerCommit(
          shellId,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
          {
            region: "shell",
            rootTrayId,
            trayId: trayIdRef.current,
            assignmentId,
            visible,
            interactive: interactionStateRef.current,
          },
        ),
      [
        assignmentId,
        interactionStateRef,
        rootTrayId,
        shellId,
        trayIdRef,
        visible,
      ],
    );
    const instrumentationEnabled = surfaceProps.instrumentationEnabled;
    const shell = (
      <TrayMorphProgressProvider value={morphProgress}>
        {instrumentationEnabled ? (
          <TraySnapshotTelemetry
            store={surfaceProps.renderSnapshotStore}
            override={renderSnapshotOverride}
            rootTrayId={rootTrayId}
            visible={visible}
          />
        ) : null}
        {shouldUseOriginTransition ? (
          <TrayOriginTransitionBackdrop
            isRendered={renderedTrayId !== undefined}
            originProgress={surfaceProps.originProgress}
            progress={progress}
          />
        ) : (
          <TrayInteractionBackdrop
            isRendered={renderedTrayId !== undefined}
            progress={progress}
          />
        )}
        {requiresFullScreenMotion && renderedTrayId !== undefined && (
          <Animated.View
            className={
              presentationFullScreen ? renderedClassName : undefined
            }
            pointerEvents="none"
            style={[
              ABSOLUTE_FILL,
              fullScreenSurfaceStyle,
              fullScreenSurfaceFillStyle,
              surfaceProps.dragStyle,
            ]}
          />
        )}
        {renderedTrayId !== undefined && (
          <TrayKeyboardStickyRegion
            capable={keyboardStickyCapable}
            enabled={
              !presentationFullScreen &&
              !surfaceProps.isFullScreenBoundaryTransition
            }
          >
            <TraySurface {...surfaceProps} />
          </TrayKeyboardStickyRegion>
        )}
      </TrayMorphProgressProvider>
    );

    if (!instrumentationEnabled) {
      return shell;
    }

    return (
      <React.Profiler id={shellId} onRender={handleProfileRender}>
        {shell}
      </React.Profiler>
    );
  },
  (previous, next) =>
    previous.assignmentId === next.assignmentId &&
    previous.rootTrayId === next.rootTrayId &&
    previous.trayIdRef === next.trayIdRef &&
    previous.visible === next.visible &&
    previous.interactionStateRef === next.interactionStateRef &&
    areTraySurfacePropsEqual(previous.surfaceProps, next.surfaceProps) &&
    previous.morphProgress === next.morphProgress &&
    previous.progress === next.progress &&
    previous.renderedTrayId === next.renderedTrayId &&
    previous.requiresFullScreenMotion === next.requiresFullScreenMotion &&
    previous.shouldUseOriginTransition === next.shouldUseOriginTransition &&
    previous.presentationFullScreen === next.presentationFullScreen &&
    previous.renderedClassName === next.renderedClassName &&
    previous.keyboardStickyCapable === next.keyboardStickyCapable &&
    previous.fullScreenSurfaceStyle === next.fullScreenSurfaceStyle &&
    previous.fullScreenSurfaceFillStyle === next.fullScreenSurfaceFillStyle &&
    previous.renderSnapshotOverride === next.renderSnapshotOverride,
);

TrayVisualShellContent.displayName = "TrayVisualShellContent";

// Own the visual/native subtree separately from the controller host. The
// controller must still run for lifecycle and measurement state, but stable
// controller identities let this component skip unrelated host commits.
const TrayVisualShell = React.memo(
  ({
    assignmentId = 0,
    prepared = false,
    style,
    rootTrayId,
    trayId,
    keyboardStickyCapable = true,
    fullScreenMotionCapable = true,
    fullScreen,
    transition,
    transitionContract,
    visible,
    shared,
    state,
    renderSnapshotStore,
    renderSnapshotOverride,
    handlers,
    interactionStateRef,
  }: TrayVisualShellProps) => {
    const {
      translateY,
      contentHeight,
      footerHeight,
      hasFooter,
      surfaceOpacity,
      progress,
      originProgress,
      originTargetContentHeight,
      morphProgress,
      transitionGenerationValue,
      fullScreenChangedValue,
      transitionStartedAt,
      transitionStartedGeneration,
      transitionLayoutStartedGeneration,
      transitionCompletedGeneration,
    } = shared;
    const keyboardGate = React.useContext(TrayKeyboardGateContext);
    const {
      layoutEnabled,
      contentHeightSnapshot,
      preparedSheetFrame,
      renderedHeader: fallbackHeader,
      renderedFooter: fallbackFooter,
      renderedContent: fallbackContent,
      renderedTrayId: fallbackTrayId,
      renderedFullScreen: fallbackFullScreen,
      renderedFullScreenBackgroundScale: fallbackSnapshotBackgroundScale,
      frameFullScreen,
      renderedFullScreenSafeAreaTop: fallbackSafeAreaTop,
      renderedContainerStyle: fallbackContainerStyle,
      renderedClassName: fallbackClassName,
      renderedFooterStyle: fallbackFooterStyle,
      renderedFooterClassName: fallbackFooterClassName,
    } = state;
    // These are the committed shell values. Same-mode step payloads are
    // intentionally not read here; the memoized TraySurface consumes the
    // snapshot store after geometry preparation and updates only its slots.
    const renderedHeader = fallbackHeader;
    const renderedFooter = fallbackFooter;
    const renderedContent = fallbackContent;
    const renderedTrayId = fallbackTrayId;
    const renderedFullScreen = fallbackFullScreen;
    const renderedFullScreenBackgroundScale =
      fallbackSnapshotBackgroundScale ?? 1;
    const renderedFullScreenSafeAreaTop =
      fallbackSafeAreaTop ?? false;
    const renderedContainerStyle = fallbackContainerStyle;
    const renderedClassName = fallbackClassName;
    const renderedFooterStyle = fallbackFooterStyle;
    const renderedFooterClassName = fallbackFooterClassName;
    const {
      handleContentLayout: latestHandleContentLayout,
      handleVisibleFooterLayout: latestHandleVisibleFooterLayout,
      handleShellLayout: latestHandleShellLayout,
      handleLayoutTransitionConfigured,
      handleLayoutTransitionStart,
      handleLayoutTransitionComplete,
    } = handlers;

    const handleContentLayout = useStableLayoutHandler(
      latestHandleContentLayout,
    );
    const handleVisibleFooterLayout = useStableLayoutHandler(
      latestHandleVisibleFooterLayout,
    );
    const handleShellLayout = useStableLayoutHandler(latestHandleShellLayout);
    const trayIdRef = useRef(trayId);
    trayIdRef.current = trayId;

    // resolve direction during render so entering and exiting content receive the same transition snapshot
    const contentMotionDirection =
      resolveTrayContentMotionDirection(transitionContract);
    const presentationFullScreen = renderedFullScreen;
    const isFullScreenBoundaryTransition =
      transitionContract?.fullScreenChanged ?? false;
    const keyboardTransitionIntent = resolveKeyboardSheetTransitionIntent(
      transitionContract,
    );
    const { isSheetStepTransition } = keyboardTransitionIntent;
    const keyboardStepTransition =
      isSheetStepTransition &&
      (keyboardTransitionIntent.sourceOwnsKeyboard ||
        keyboardTransitionIntent.targetOwnsKeyboard);
    const instrumentationEnabled = isTrayInstrumentationEnabled();
    const shouldUseOriginTransition =
      transition?.open === "expandFromTrigger" && !presentationFullScreen;
    // A trigger-origin presentation can enter through a fullscreen parent or
    // endpoint even when this registration has no fullscreen step of its own.
    // Keep the boundary participants mounted for that path from its first
    // render so the opening frame never changes topology mid-transition.
    const requiresFullScreenMotion =
      fullScreenMotionCapable ||
      fullScreen ||
      presentationFullScreen ||
      frameFullScreen ||
      transition?.open === "expandFromTrigger" ||
      transitionContract?.fullScreenChanged === true ||
      transitionContract?.from?.mode === "fullScreen" ||
      transitionContract?.to?.mode === "fullScreen";

    // wait for layout and keyboard state before drag starts
    const hasValidBoundarySheetFrame = isSheetFrameForTransition(
      preparedSheetFrame,
      transitionContract?.generation,
      undefined,
      resolveTransitionEndpointKey(transitionContract?.to),
    );
    const boundaryGeometryReady =
      !isFullScreenBoundaryTransition ||
      transitionContract?.to?.mode === "fullScreen" ||
      hasValidBoundarySheetFrame;
    // The generation of the step content currently mounted, written by the
    // content region's commit. The fullscreen-to-sheet clock waits for it.
    const contentCommittedGeneration = useSharedValue(0);
    const shellGenerationRef = useRef(0);
    shellGenerationRef.current = transitionContract?.generation ?? 0;
    const contentCommitTarget = useMemo<TrayContentCommitTarget>(
      () => ({
        committedGeneration: contentCommittedGeneration,
        shellGenerationRef,
      }),
      [contentCommittedGeneration],
    );
    const boundaryMotionParams: TrayBoundaryMotionParams = {
      contentCommittedGeneration,
      presentationFullScreen,
      renderedFullScreenBackgroundScale,
      renderedFullScreenSafeAreaTop,
      visibilityProgress: progress,
      morphProgress,
      transitionStartedAt,
      transitionStartedGeneration,
      transitionLayoutStartedGeneration,
      transitionCompletedGeneration,
      transitionContract: transitionContract ?? null,
      boundaryGeometryReady,
      onTransitionStart: handleLayoutTransitionStart,
      onTransitionComplete: handleLayoutTransitionComplete,
    };
    const shouldUseLayoutAnimation =
      layoutEnabled && !isFullScreenBoundaryTransition;
    const hasStepContentTransition =
      transitionContract?.stepChanged === true ||
      transitionContract?.pageChanged === true;
    // The content barrier is only meaningful when this tray has a shell
    // participant for the same transition generation. Full-screen boundaries
    // use the explicit morph-progress layout participant; sheet step changes
    // use the native shell layout participant. Open/close and other contracts
    // must not leave content waiting for a layout animation that was never
    // scheduled.
    const layoutStartRequired =
      isFullScreenBoundaryTransition ||
      (hasStepContentTransition && shouldUseLayoutAnimation);

    useEffect(() => {
      if (!isTrayDebugLoggingEnabled()) {
        return;
      }

      log("SHELL LAYOUT POLICY", {
        trayId,
        renderedTrayId,
        assignmentId,
        layoutEnabled,
        nativeLayoutAnimationEnabled: shouldUseLayoutAnimation,
        fullScreenBoundaryTransition: isFullScreenBoundaryTransition,
        incomingFullScreen: !!fullScreen,
        frameFullScreen,
        presentationFullScreen,
        preparedSheetFrame: preparedSheetFrame
          ? {
              endpointKey: preparedSheetFrame.endpointKey,
              generation: preparedSheetFrame.generation,
              totalHeight: preparedSheetFrame.totalHeight,
              contentHeight: preparedSheetFrame.contentHeight,
            }
          : null,
        transition: describeTrayTransition(transitionContract),
      });
    }, [
      assignmentId,
      frameFullScreen,
      fullScreen,
      isFullScreenBoundaryTransition,
      layoutEnabled,
      preparedSheetFrame,
      presentationFullScreen,
      renderedTrayId,
      shouldUseLayoutAnimation,
      trayId,
      transitionContract,
    ]);

    const animatedStyleParams = {
      translateY,
      contentHeight,
      contentHeightSnapshot,
      hasFooter,
      surfaceOpacity,
      footerHeight,
      frameFullScreen,
      fullScreen: presentationFullScreen,
      preparedSheetFrame,
      visible,
      layoutEnabled,
      originProgress,
      originTargetContentHeight,
      morphProgress,
      transitionStartedGeneration,
      transitionLayoutStartedGeneration,
      transitionCompletedGeneration,
      fullScreenBoundaryTransition:
        transitionContract?.fullScreenChanged ?? false,
      fullScreenBoundarySourceFullScreen:
        transitionContract?.fullScreenChanged
          ? transitionContract.from?.mode === "fullScreen"
          : undefined,
      fullScreenBoundaryTargetFullScreen:
        transitionContract?.fullScreenChanged
          ? transitionContract.to?.mode === "fullScreen"
          : undefined,
      transitionGeneration: transitionContract?.generation,
      transitionSourceKey: resolveTransitionEndpointKey(
        transitionContract?.from,
      ),
      transitionTargetKey: resolveTransitionEndpointKey(
        transitionContract?.to,
      ),
      transition,
    };

    const layoutAnimationConfig = useMemo(
      () =>
        createTrayLayoutTransition({
          transitionGeneration: transitionContract?.generation ?? 0,
          transitionStartedAt,
          transitionStartedGeneration,
          transitionLayoutStartedGeneration,
          transitionCompletedGeneration,
          morphProgress,
          keyboardGate: keyboardGate ?? undefined,
          onConfigure: instrumentationEnabled
            ? handleLayoutTransitionConfigured
            : undefined,
          onStart: instrumentationEnabled
            ? handleLayoutTransitionStart
            : undefined,
          onComplete: handleLayoutTransitionComplete,
        }),
      [
        transitionContract?.generation,
        transitionStartedAt,
        transitionStartedGeneration,
        transitionLayoutStartedGeneration,
        transitionCompletedGeneration,
        morphProgress,
        keyboardGate,
        handleLayoutTransitionConfigured,
        handleLayoutTransitionComplete,
        handleLayoutTransitionStart,
        instrumentationEnabled,
      ],
    );
    const trayTransitionStart = useMemo(
      () => ({
        generation: transitionContract?.generation ?? 0,
        fullScreenChanged: transitionContract?.fullScreenChanged ?? false,
        layoutStartRequired,
        keyboardStepTransition,
        generationValue: transitionGenerationValue,
        fullScreenChangedValue,
        morphProgress,
        startedAt: transitionStartedAt,
        startedGeneration: transitionStartedGeneration,
        layoutStartedGeneration: transitionLayoutStartedGeneration,
        completedGeneration: transitionCompletedGeneration,
      }),
      [
        transitionContract,
        layoutStartRequired,
        keyboardStepTransition,
        transitionGenerationValue,
        fullScreenChangedValue,
        transitionStartedAt,
        transitionStartedGeneration,
        transitionLayoutStartedGeneration,
        transitionCompletedGeneration,
        morphProgress,
      ],
    );
    const flattenedContainerStyle = useMemo(
      () => StyleSheet.flatten(renderedContainerStyle),
      [renderedContainerStyle],
    );
    const fullScreenSurfaceStyle = useMemo(
      () =>
        flattenedContainerStyle?.backgroundColor
          ? { backgroundColor: flattenedContainerStyle.backgroundColor }
          : undefined,
      [flattenedContainerStyle],
    );
    const shellTransitionValue = useMemo<TrayShellTransitionValue>(
      () => ({
        contentMotionDirection,
        trayTransitionStart,
        layoutAnimationConfig,
      }),
      [contentMotionDirection, layoutAnimationConfig, trayTransitionStart],
    );

    return (
      <TrayShellTransitionContext.Provider value={shellTransitionValue}>
       <TrayContentCommitTargetContext.Provider value={contentCommitTarget}>
        <TrayBoundaryMotionRegion
          enabled={requiresFullScreenMotion}
          params={boundaryMotionParams}
          animatedStyleParams={animatedStyleParams}
          prepared={prepared}
        >
          {(boundaryStyles, animatedStyles) => {
            const { presentationFrameStyle, ...surfaceAnimatedStyles } =
              animatedStyles;
            const surfaceProps: TraySurfaceProps = {
              ...surfaceAnimatedStyles,
              style,
              renderedContainerStyle,
              renderedHeader,
              renderedContent,
              renderedFooter,
              renderedFooterClassName,
              renderedFooterStyle,
              hasFooter,
              renderSnapshotStore,
              renderedFullScreen: presentationFullScreen,
              instrumentationEnabled,
              shouldUseLayoutAnimation,
              isFullScreenBoundaryTransition,
              handleContentLayout,
              handleVisibleFooterLayout,
              handleShellLayout,
              fullScreenSafeAreaContentStyle:
                boundaryStyles?.fullScreenSafeAreaContentStyle,
              originProgress,
            };

            return (
              <TraySheetFrameProvider
                presentationFrameStyle={presentationFrameStyle}
                renderedClassName={renderedClassName}
              >
                <TrayVisualShellContent
                  assignmentId={assignmentId}
                  rootTrayId={rootTrayId}
                  trayIdRef={trayIdRef}
                  visible={visible}
                  interactionStateRef={interactionStateRef}
                  surfaceProps={surfaceProps}
                  morphProgress={morphProgress}
                  progress={progress}
                  renderedTrayId={renderedTrayId}
                  requiresFullScreenMotion={requiresFullScreenMotion}
                  shouldUseOriginTransition={shouldUseOriginTransition}
                  presentationFullScreen={presentationFullScreen}
                  renderedClassName={renderedClassName}
                  keyboardStickyCapable={keyboardStickyCapable}
                  fullScreenSurfaceStyle={fullScreenSurfaceStyle}
                  fullScreenSurfaceFillStyle={
                    boundaryStyles?.fullScreenSurfaceFillStyle
                  }
                  renderSnapshotOverride={renderSnapshotOverride}
                />
              </TraySheetFrameProvider>
            );
          }}
        </TrayBoundaryMotionRegion>
       </TrayContentCommitTargetContext.Provider>
      </TrayShellTransitionContext.Provider>
    );
  },
  areTrayVisualShellPropsEqual,
);

TrayVisualShell.displayName = "TrayVisualShell";

type TrayVisualViewBodyProps = TrayVisualViewProps & {
  keyboardStickyEnabled: boolean;
};

// Keyboard and interaction changes update their consumers without rerunning
// the shell's animation policy when its visual inputs remain stable.
const TrayVisualViewBody = React.memo(
  ({ keyboardStickyEnabled, ...props }: TrayVisualViewBodyProps) => {
    const {
      assignmentId = 0,
      prepared = false,
      rootTrayId,
      keyboardStickyCapable = true,
      fullScreenMotionCapable = true,
      fullScreen,
      dismissible = true,
      transitionContract,
      visible,
      interactive = true,
      isSurfaceReady,
      fullScreenDraggable,
      shared,
      state,
      handlers,
      ...shellProps
    } = props;
    const interactionStateRef = useRef(interactive);
    interactionStateRef.current = interactive;

    const gesture = useTrayGesture({
      translateY: shared.translateY,
      totalHeight: shared.totalHeight,
      context: shared.context,
      interactive: interactive && isSurfaceReady && dismissible,
      fullScreen: state.renderedFullScreen,
      fullScreenDraggable,
      onRequestClose: handlers.handleRequestClose,
    });
    const shellHandlers = useMemo(
      () => ({
        handleContentLayout: handlers.handleContentLayout,
        handleVisibleFooterLayout: handlers.handleVisibleFooterLayout,
        handleShellLayout: handlers.handleShellLayout,
        handleLayoutTransitionConfigured:
          handlers.handleLayoutTransitionConfigured,
        handleLayoutTransitionStart: handlers.handleLayoutTransitionStart,
        handleLayoutTransitionComplete:
          handlers.handleLayoutTransitionComplete,
      }),
      [
        handlers.handleContentLayout,
        handlers.handleVisibleFooterLayout,
        handlers.handleShellLayout,
        handlers.handleLayoutTransitionConfigured,
        handlers.handleLayoutTransitionStart,
        handlers.handleLayoutTransitionComplete,
      ],
    );
    const footerInteraction = useMemo(
      () => ({ interactive, isSurfaceReady }),
      [interactive, isSurfaceReady],
    );
    const onRequestClose = dismissible
      ? handlers.handleRequestClose
      : NOOP_TRAY_CLOSE;
    const backdropInteraction = useMemo(
      () => ({ interactive, onRequestClose }),
      [interactive, onRequestClose],
    );

    return (
      <TrayBackdropInteractionContext.Provider value={backdropInteraction}>
        <TrayGestureContext.Provider value={gesture}>
          <TrayFooterInteractionContext.Provider value={footerInteraction}>
            <TrayKeyboardStickyContext.Provider value={keyboardStickyEnabled}>
              <TrayVisualShell
                {...shellProps}
                assignmentId={assignmentId}
                prepared={prepared}
                rootTrayId={rootTrayId}
                keyboardStickyCapable={keyboardStickyCapable}
                fullScreenMotionCapable={fullScreenMotionCapable}
                fullScreen={fullScreen}
                transitionContract={transitionContract}
                visible={visible}
                shared={shared}
                state={state}
                handlers={shellHandlers}
                interactionStateRef={interactionStateRef}
              />
            </TrayKeyboardStickyContext.Provider>
          </TrayFooterInteractionContext.Provider>
        </TrayGestureContext.Provider>
      </TrayBackdropInteractionContext.Provider>
    );
  },
);

TrayVisualViewBody.displayName = "TrayVisualViewBody";

const TrayKeyboardCapableVisualView = React.memo(
  (props: TrayVisualViewProps) => {
    const keyboardTransitionIntent = resolveKeyboardSheetTransitionIntent(
      props.transitionContract,
    );
    const keyboardArmedGeneration = useSharedValue(0);
    const keyboardStartedGeneration = useSharedValue(0);
    const keyboardArmedTarget = useSharedValue(1);
    const keyboardGateWaitStartedAt = useSharedValue(0);
    const keyboardGateOpenedAt = useSharedValue(0);
    const keyboardGateOpenedBy = useSharedValue(0);
    const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();
    // generation of a step that puts the keyboard away and has not dismissed
    // it yet; the dismissal waits for that step's layout to be ready
    const pendingKeyboardDismissRef = useRef(0);
    const dismissKeyboardForLayout = useCallback((generation: number) => {
      if (
        pendingKeyboardDismissRef.current === 0 ||
        pendingKeyboardDismissRef.current !== generation
      ) {
        return;
      }

      pendingKeyboardDismissRef.current = 0;
      void KeyboardController.dismiss({ keepFocus: false, animated: true });
    }, []);
    const keyboardGate = useMemo<TrayKeyboardGate>(
      () => ({
        armedGeneration: keyboardArmedGeneration,
        startedGeneration: keyboardStartedGeneration,
        armedTarget: keyboardArmedTarget,
        keyboardProgress,
        onLayoutReady: dismissKeyboardForLayout,
        waitStartedAt: keyboardGateWaitStartedAt,
        openedAt: keyboardGateOpenedAt,
        openedBy: keyboardGateOpenedBy,
      }),
      [
        keyboardGateOpenedAt,
        keyboardGateOpenedBy,
        keyboardGateWaitStartedAt,
        dismissKeyboardForLayout,
        keyboardArmedGeneration,
        keyboardArmedTarget,
        keyboardProgress,
        keyboardStartedGeneration,
      ],
    );
    const keyboardGateGeneration =
      props.visible &&
      (keyboardTransitionIntent.entersKeyboard ||
        keyboardTransitionIntent.leavesKeyboard)
        ? (props.transitionContract?.generation ?? 0)
        : 0;
    const keyboardGateTarget = keyboardTransitionIntent.entersKeyboard ? 1 : 0;

    // Arm on the step commit. The sheet's layout cannot start for several
    // frames after this, so the gate is always armed before it is checked.
    useLayoutEffect(() => {
      if (
        keyboardGateGeneration <= 0 ||
        keyboardGateGeneration === keyboardArmedGeneration.value
      ) {
        return;
      }

      if (keyboardGateTarget === 0) {
        pendingKeyboardDismissRef.current = keyboardGateGeneration;
      }

      keyboardGateWaitStartedAt.value = 0;
      keyboardGateOpenedAt.value = 0;
      keyboardGateOpenedBy.value = 0;
      keyboardArmedTarget.value = keyboardGateTarget;
      keyboardArmedGeneration.value = keyboardGateGeneration;
    }, [
      keyboardGateOpenedAt,
      keyboardGateOpenedBy,
      keyboardGateWaitStartedAt,
      keyboardArmedGeneration,
      keyboardArmedTarget,
      keyboardGateGeneration,
      keyboardGateTarget,
    ]);

    // instrumentation: report how and when the gate opened to the step trace
    const gateInstrumented = isTrayInstrumentationEnabled();
    const rootTrayId = props.rootTrayId;
    const reportKeyboardGate = useCallback(
      (waitStartedAt: number, openedAt: number, openedBy: number) => {
        markTrayStepKeyboardGate(rootTrayId, waitStartedAt, openedAt, openedBy);
      },
      [rootTrayId],
    );

    useAnimatedReaction(
      () => (gateInstrumented ? keyboardGateOpenedBy.value : 0),
      (openedBy, previous) => {
        if (openedBy > 0 && openedBy !== previous) {
          scheduleOnRN(
            reportKeyboardGate,
            keyboardGateWaitStartedAt.value,
            keyboardGateOpenedAt.value,
            openedBy,
          );
        }
      },
      [gateInstrumented, reportKeyboardGate],
    );

    // The keyboard's start runs on the UI thread on the frame it begins to
    // move, which is the frame the sheet and content should begin on too.
    useGenericKeyboardHandler(
      {
        onStart: () => {
          "worklet";

          openTrayKeyboardGate(keyboardGate);
        },
      },
      [keyboardGate],
    );
    const keyboard = useSheetTrayKeyboard({
      rootTrayId: props.rootTrayId,
      visible: props.visible,
      keyboardAware: !props.fullScreen && (props.keyboardAware ?? false),
      targetKeyboardAware:
        keyboardTransitionIntent.isSheetStepTransition &&
        keyboardTransitionIntent.targetOwnsKeyboard,
      sheetStepTransition: keyboardTransitionIntent.isSheetStepTransition,
      transitionGeneration: props.transitionContract?.generation,
    });
    const isFullScreenBoundaryTransition =
      props.transitionContract?.fullScreenChanged ?? false;
    const keyboardStepTransition =
      keyboardTransitionIntent.isSheetStepTransition &&
      (keyboardTransitionIntent.sourceOwnsKeyboard ||
        keyboardTransitionIntent.targetOwnsKeyboard);

    useEffect(() => {
      if (!isTrayDebugLoggingEnabled()) {
        return;
      }

      log("KEYBOARD STEP CLASSIFICATION", {
        trayId: props.trayId,
        fromStep: props.transitionContract?.from?.stepKey,
        toStep: props.transitionContract?.to?.stepKey,
        fromKeyboardAware:
          props.transitionContract?.from?.keyboardAware ?? false,
        toKeyboardAware:
          props.transitionContract?.to?.keyboardAware ?? false,
        fromMode: props.transitionContract?.from?.mode,
        toMode: props.transitionContract?.to?.mode,
        fullScreenChanged: isFullScreenBoundaryTransition,
        keyboardStepTransition,
        visible: props.visible,
        presentationFullScreen: props.state.renderedFullScreen,
        stickyEnabled: keyboard.stickyEnabled,
      });
    }, [
      isFullScreenBoundaryTransition,
      keyboard.stickyEnabled,
      keyboardStepTransition,
      props.state.renderedFullScreen,
      props.trayId,
      props.transitionContract,
      props.visible,
    ]);

    return (
      <TrayKeyboardGateContext.Provider value={keyboardGate}>
        <TrayVisualViewBody
          {...props}
          keyboardStickyEnabled={keyboard.stickyEnabled}
        />
      </TrayKeyboardGateContext.Provider>
    );
  },
);

TrayKeyboardCapableVisualView.displayName = "TrayKeyboardCapableVisualView";

const TrayVisualView = React.memo((props: TrayVisualViewProps) =>
  props.keyboardStickyCapable === false ? (
    <TrayVisualViewBody {...props} keyboardStickyEnabled={false} />
  ) : (
    <TrayKeyboardCapableVisualView {...props} />
  ),
);

TrayVisualView.displayName = "TrayVisualView";

const localStyles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: TRAY_HEADER_HORIZONTAL_PADDING,
  },
});

export { TrayVisualView };
