import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Animated as RNAnimated, StyleSheet } from "react-native";
import Animated, {
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { useKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backdrop } from "../primitives/backdrop";
import { useTrayBackgroundScale } from "../runtime/tray-background-scale";
import { createTrayLayoutTransition } from "./animation/tray-layout";
import { styles as trayStyles } from "./animation/tray-styles";
import { TrayOriginProgressProvider } from "./tray-origin-progress";
import { isTrayInstrumentationEnabled } from "../telemetry/config";
import { logTrayProfilerCommit } from "../telemetry/tray-profiler";
import { markTrayBoundarySnapshotCommitted } from "../telemetry/tray-boundary-timing";
import { markTrayStepRenderedCommit } from "../telemetry/tray-step-timing";
import { TrayMorphProgressProvider } from "./tray-morph-progress";
import {
  TrayTransitionStartProvider,
  type TrayTransitionStart,
} from "./transition-start";
import {
  resolveTrayContentMotionDirection,
  TrayContentMotionDirectionProvider,
} from "./transition-motion-direction";
import { useTrayAnimatedStyles } from "./animation/use-tray-animated-styles";
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
import { log } from "./logger";
import {
  TRAY_HEADER_HORIZONTAL_PADDING,
  TRAY_KEYBOARD_GAP,
} from "./constants";
import type { RenderedTrayState, TrayProps } from "./types";

type TrayVisualViewProps = Pick<
  TrayProps,
  | "assignmentId"
  | "style"
  | "rootTrayId"
  | "trayId"
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

type TraySurfaceInteraction = {
  gesture: ReturnType<typeof useTrayGesture>;
  interactive: boolean;
  isSurfaceReady: boolean;
  onRequestClose: () => void;
};

type TrayBackdropInteraction = Pick<
  TraySurfaceInteraction,
  "interactive" | "onRequestClose"
>;

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
  previous.style === next.style &&
  previous.rootTrayId === next.rootTrayId &&
  previous.trayId === next.trayId &&
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

const TraySurfaceInteractionContext = React.createContext<
  TraySurfaceInteraction | undefined
>(undefined);
const TrayBackdropInteractionContext = React.createContext<
  TrayBackdropInteraction | undefined
>(undefined);
const TrayKeyboardStickyContext = React.createContext(false);
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

const TrayKeyboardStickyRegion = React.memo(
  ({ enabled, children }: { enabled: boolean; children: React.ReactNode }) => {
    const keyboardStickyEnabled = React.useContext(
      TrayKeyboardStickyContext,
    );
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
      () => [stickyStyle, StyleSheet.absoluteFillObject],
      [stickyStyle],
    );

    return (
      <RNAnimated.View pointerEvents="box-none" style={styles}>
        {children}
      </RNAnimated.View>
    );
  },
);

TrayKeyboardStickyRegion.displayName = "TrayKeyboardStickyRegion";

type TrayAnimatedStyles = ReturnType<
  typeof useTrayAnimatedStyles
>;

type TrayBoundaryStyles = ReturnType<typeof useTrayBoundaryMotionState>;

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
  | "presentationFrameStyle"
  | "surfaceVisibilityStyle"
  | "originSurfaceVisibilityStyle"
  | "trayLayoutStyle"
> &
  Pick<
    TrayBoundaryStyles,
    "fullScreenSafeAreaContentStyle"
  > &
  Pick<
    TrayController["handlers"],
    | "handleContentLayout"
    | "handleVisibleFooterLayout"
    | "handleShellLayout"
  > & {
    hasFooter: TrayController["shared"]["hasFooter"];
    style?: TrayProps["style"];
    renderedClassName?: string;
    renderedContainerStyle?: TrayProps["containerStyle"];
    renderedHeader: React.ReactNode;
    renderedContent: React.ReactNode;
    renderedFooter: React.ReactNode;
    renderedFooterClassName?: string;
    renderedFooterStyle?: TrayProps["footerStyle"];
    renderSnapshotStore?: TrayRenderSnapshotStore;
    renderedFullScreen: boolean;
    contentMotionDirection: ReturnType<
      typeof resolveTrayContentMotionDirection
    >;
    trayTransitionStart: TrayTransitionStart;
    layoutAnimationConfig: ReturnType<typeof createTrayLayoutTransition>;
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

    useLayoutEffect(() => {
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
const areTraySurfacePropsEqual = (
  previous: TraySurfaceProps,
  next: TraySurfaceProps,
) => {
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
    previous.renderedClassName === next.renderedClassName &&
    previous.renderedContainerStyle === next.renderedContainerStyle &&
    previous.renderedFooterClassName === next.renderedFooterClassName &&
    previous.renderedFooterStyle === next.renderedFooterStyle &&
    previous.renderedFullScreen === next.renderedFullScreen &&
    previous.contentMotionDirection === next.contentMotionDirection &&
    previous.trayTransitionStart === next.trayTransitionStart &&
    previous.layoutAnimationConfig === next.layoutAnimationConfig &&
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
    previous.presentationFrameStyle === next.presentationFrameStyle &&
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

const TraySurface = React.memo(
  ({
    hasFooter,
    style,
    renderedClassName,
    renderedContainerStyle,
    renderedHeader,
    renderedContent,
    renderedFooter,
    renderedFooterClassName,
    renderedFooterStyle,
    renderSnapshotStore,
    renderedFullScreen,
    contentMotionDirection,
    trayTransitionStart,
    layoutAnimationConfig,
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
    presentationFrameStyle,
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
    const interaction = React.useContext(TraySurfaceInteractionContext)!;
    // The region elements are stable shell slots. Their own subscriptions
    // update step payloads without publishing through this native surface.
    const surfaceClassName = renderedClassName;
    const surfaceContainerStyle = renderedContainerStyle;
    const surfaceFooterClassName = renderedFooterClassName;
    const surfaceFooterStyle = renderedFooterStyle;
    const surfaceHeader = renderedHeader;
    const surfaceContent = renderedContent;
    const surfaceFooter = renderedFooter;

    useLayoutEffect(() => {
      hasFooter.value = surfaceFooter != null;
    }, [hasFooter, surfaceFooter]);

    return (
    <>
      <GestureDetector gesture={interaction.gesture}>
        <Animated.View
          className={surfaceClassName}
          style={[
            trayStyles.container,
            trayLayoutStyle,
            presentationFrameStyle,
            surfaceContainerStyle,
            surfaceVisibilityStyle,
            originSurfaceVisibilityStyle,
            dragStyle,
            style,
          ]}
          onLayout={instrumentationEnabled ? handleShellLayout : undefined}
          layout={shouldUseLayoutAnimation ? layoutAnimationConfig : undefined}
        >
          <Animated.View
            style={[
              trayStyles.content,
              // apply the clock aware frame last so target topology wins
              ...(isFullScreenBoundaryTransition
                ? [contentBoundarySourceStyle, contentFrameStyle]
                : [contentFrameStyle]),
              contentRevealStyle,
            ]}
          >
            <Animated.View
              style={[
                contentPaddingStyle,
                contentBoundarySourceViewportStyle,
                contentViewportStyle,
                fullScreenSafeAreaContentStyle,
              ]}
            >
              <Animated.View
                // Measure the content snapshot, not the animated boundary
                // viewport that can retain the previous endpoint's height.
                collapsable={false}
                onLayout={handleContentLayout}
                style={renderedFullScreen ? { flex: 1 } : undefined}
              >
                <TrayContentMotionDirectionProvider
                  value={contentMotionDirection}
                >
                  <TrayTransitionStartProvider value={trayTransitionStart}>
                    {surfaceHeader ? (
                      <Animated.View
                        style={[localStyles.headerContainer, headerFrameStyle]}
                      >
                        {renderSnapshotStore ? (
                          <TraySnapshotRegion
                            store={renderSnapshotStore}
                            region="header"
                          />
                        ) : (
                          <TrayRenderedNode node={surfaceHeader} />
                        )}
                      </Animated.View>
                    ) : null}
                    {renderSnapshotStore ? (
                      <TraySnapshotRegion
                        store={renderSnapshotStore}
                        region="content"
                      />
                    ) : (
                      <TrayRenderedNode node={surfaceContent} />
                    )}
                  </TrayTransitionStartProvider>
                </TrayContentMotionDirectionProvider>
              </Animated.View>
            </Animated.View>
            {/* reserve footer space the footer itself is absolute and does not participate in content measurement */}
            <Animated.View style={footerSpacerStyle} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {/* fixed footers stay outside the layout animated shell only a fullscreen boundary may move this layer and then it follows the shell s explicit morph clock rather than content layout */}
      <Animated.View
        className={surfaceFooterClassName}
        onLayout={handleVisibleFooterLayout}
        style={[
          trayStyles.footer,
          dragStyle,
          surfaceFooterStyle,
          footerContainerStyle,
          footerVisibilityStyle,
        ]}
        pointerEvents={
          surfaceFooter &&
          interaction.interactive &&
          interaction.isSurfaceReady
            ? "auto"
            : "none"
        }
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
      </Animated.View>
    </>
    );
  },
  areTraySurfacePropsEqual,
);

TraySurface.displayName = "TraySurface";

// Own the visual/native subtree separately from the controller host. The
// controller must still run for lifecycle and measurement state, but stable
// controller identities let this component skip unrelated host commits.
const TrayVisualShell = React.memo(
  ({
    assignmentId = 0,
    style,
    rootTrayId,
    trayId,
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
      handleContentLayout,
      handleVisibleFooterLayout,
      handleShellLayout,
      handleLayoutTransitionConfigured,
      handleLayoutTransitionStart,
      handleLayoutTransitionComplete,
    } = handlers;

    // resolve direction during render so entering and exiting content receive the same transition snapshot
    const contentMotionDirection =
      resolveTrayContentMotionDirection(transitionContract);
    const presentationFullScreen = renderedFullScreen;
    const { top: safeAreaTopInset } = useSafeAreaInsets();
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
    const providerBackgroundScale = useTrayBackgroundScale();
    const fallbackBackgroundScale = useSharedValue(1);
    // nested test shells may render without a provider so keep a local scale value
    const backgroundScale =
      providerBackgroundScale ?? fallbackBackgroundScale;
    const instrumentationEnabled = isTrayInstrumentationEnabled();
    const shouldUseOriginTransition =
      transition?.open === "expandFromTrigger" && !presentationFullScreen;

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

    const {
      footerSpacerStyle,
      contentBoundarySourceStyle,
      contentBoundarySourceViewportStyle,
      contentFrameStyle,
      contentViewportStyle,
      headerFrameStyle,
      presentationFrameStyle,
      trayLayoutStyle,
      footerContainerStyle,
      contentPaddingStyle,
      dragStyle,
      surfaceVisibilityStyle,
      originSurfaceVisibilityStyle,
      contentRevealStyle,
      footerVisibilityStyle,
      footerContentFrameStyle,
    } = useTrayAnimatedStyles({
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
    });

    const { fullScreenSafeAreaContentStyle, fullScreenSurfaceFillStyle } =
      useTrayBoundaryMotionState({
        presentationFullScreen,
        renderedFullScreenBackgroundScale,
        renderedFullScreenSafeAreaTop,
        safeAreaTopInset,
        visibilityProgress: progress,
        morphProgress,
        backgroundScale,
        transitionStartedAt,
        transitionStartedGeneration,
        transitionLayoutStartedGeneration,
        transitionCompletedGeneration,
        transitionContract: transitionContract ?? null,
        boundaryGeometryReady,
        onTransitionStart: handleLayoutTransitionStart,
        onTransitionComplete: handleLayoutTransitionComplete,
      });
    const layoutAnimationConfig = useMemo(
      () =>
        createTrayLayoutTransition({
          transitionGeneration: transitionContract?.generation ?? 0,
          transitionStartedAt,
          transitionStartedGeneration,
          transitionLayoutStartedGeneration,
          transitionCompletedGeneration,
          morphProgress,
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
    const shellId = `tray-region:${trayId ?? rootTrayId ?? assignmentId}:shell`;
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
            trayId,
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
        trayId,
        visible,
      ],
    );

    const shell = (
      <TrayMorphProgressProvider value={morphProgress}>
        {instrumentationEnabled ? (
          <TraySnapshotTelemetry
            store={renderSnapshotStore}
            override={renderSnapshotOverride}
            rootTrayId={rootTrayId}
            visible={visible}
          />
        ) : null}
        {shouldUseOriginTransition ? (
          <TrayOriginTransitionBackdrop
            isRendered={renderedTrayId !== undefined}
            originProgress={originProgress}
            progress={progress}
          />
        ) : (
          <TrayInteractionBackdrop
            isRendered={renderedTrayId !== undefined}
            progress={progress}
          />
        )}

        {renderedTrayId !== undefined && (
          <Animated.View
            className={presentationFullScreen ? renderedClassName : undefined}
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              fullScreenSurfaceStyle,
              fullScreenSurfaceFillStyle,
              dragStyle,
            ]}
          />
        )}

        {renderedTrayId !== undefined && (
          // Only sheet endpoints participate in this native keyboard handoff.
          // Fullscreen keyboard behavior is intentionally not carried to main.
          <TrayKeyboardStickyRegion
            enabled={!presentationFullScreen && !isFullScreenBoundaryTransition}
          >
            <TraySurface
              style={style}
              renderedClassName={renderedClassName}
              renderedContainerStyle={renderedContainerStyle}
              renderedHeader={renderedHeader}
              renderedContent={renderedContent}
              renderedFooter={renderedFooter}
              renderedFooterClassName={renderedFooterClassName}
              renderedFooterStyle={renderedFooterStyle}
              hasFooter={hasFooter}
              renderSnapshotStore={renderSnapshotStore}
              renderedFullScreen={presentationFullScreen}
              contentMotionDirection={contentMotionDirection}
              trayTransitionStart={trayTransitionStart}
              layoutAnimationConfig={layoutAnimationConfig}
              instrumentationEnabled={instrumentationEnabled}
              shouldUseLayoutAnimation={shouldUseLayoutAnimation}
              isFullScreenBoundaryTransition={
                isFullScreenBoundaryTransition
              }
              handleContentLayout={handleContentLayout}
              handleVisibleFooterLayout={handleVisibleFooterLayout}
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
              presentationFrameStyle={presentationFrameStyle}
              trayLayoutStyle={trayLayoutStyle}
              footerContainerStyle={footerContainerStyle}
              dragStyle={dragStyle}
              surfaceVisibilityStyle={surfaceVisibilityStyle}
              originSurfaceVisibilityStyle={originSurfaceVisibilityStyle}
              footerVisibilityStyle={footerVisibilityStyle}
              footerContentFrameStyle={footerContentFrameStyle}
              fullScreenSafeAreaContentStyle={fullScreenSafeAreaContentStyle}
              originProgress={originProgress}
            />
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
  areTrayVisualShellPropsEqual,
);

TrayVisualShell.displayName = "TrayVisualShell";

// Keyboard and interaction changes update their consumers without rerunning
// the shell's animation policy when its visual inputs remain stable.
const TrayVisualView = React.memo((props: TrayVisualViewProps) => {
  const {
    assignmentId = 0,
    rootTrayId,
    fullScreen,
    dismissible = true,
    transitionContract,
    visible,
    interactive = true,
    keyboardAware,
    isSurfaceReady,
    fullScreenDraggable,
    shared,
    state,
    handlers,
    ...shellProps
  } = props;
  const interactionStateRef = useRef(interactive);
  interactionStateRef.current = interactive;
  const keyboardTransitionIntent = resolveKeyboardSheetTransitionIntent(
    transitionContract,
  );
  const keyboard = useSheetTrayKeyboard({
    rootTrayId,
    visible,
    keyboardAware: !fullScreen && (keyboardAware ?? false),
    targetKeyboardAware:
      keyboardTransitionIntent.isSheetStepTransition &&
      keyboardTransitionIntent.targetOwnsKeyboard,
    sheetStepTransition: keyboardTransitionIntent.isSheetStepTransition,
    transitionGeneration: transitionContract?.generation,
  });
  const isFullScreenBoundaryTransition =
    transitionContract?.fullScreenChanged ?? false;
  const presentationFullScreen = state.renderedFullScreen;
  const keyboardStepTransition =
    keyboardTransitionIntent.isSheetStepTransition &&
    (keyboardTransitionIntent.sourceOwnsKeyboard ||
      keyboardTransitionIntent.targetOwnsKeyboard);

  useEffect(() => {
    log("KEYBOARD STEP CLASSIFICATION", {
      trayId: props.trayId,
      fromStep: transitionContract?.from?.stepKey,
      toStep: transitionContract?.to?.stepKey,
      fromKeyboardAware: transitionContract?.from?.keyboardAware ?? false,
      toKeyboardAware: transitionContract?.to?.keyboardAware ?? false,
      fromMode: transitionContract?.from?.mode,
      toMode: transitionContract?.to?.mode,
      fullScreenChanged: isFullScreenBoundaryTransition,
      keyboardStepTransition,
      visible,
      presentationFullScreen,
      stickyEnabled: keyboard.stickyEnabled,
    });
  }, [
    isFullScreenBoundaryTransition,
    keyboard.stickyEnabled,
    keyboardStepTransition,
    presentationFullScreen,
    props.trayId,
    transitionContract,
    visible,
  ]);

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
  const interaction = useMemo(
    () => ({
      gesture,
      interactive,
      isSurfaceReady,
      onRequestClose: dismissible
        ? handlers.handleRequestClose
        : NOOP_TRAY_CLOSE,
    }),
    [
      dismissible,
      gesture,
      handlers.handleRequestClose,
      interactive,
      isSurfaceReady,
    ],
  );
  const backdropInteraction = useMemo(
    () => ({
      interactive,
      onRequestClose: interaction.onRequestClose,
    }),
    [interactive, interaction.onRequestClose],
  );

  return (
    <TrayBackdropInteractionContext.Provider value={backdropInteraction}>
      <TraySurfaceInteractionContext.Provider value={interaction}>
        <TrayKeyboardStickyContext.Provider value={keyboard.stickyEnabled}>
          <TrayVisualShell
            {...shellProps}
            assignmentId={assignmentId}
            rootTrayId={rootTrayId}
            fullScreen={fullScreen}
            transitionContract={transitionContract}
            visible={visible}
            shared={shared}
            state={state}
            handlers={shellHandlers}
            interactionStateRef={interactionStateRef}
          />
        </TrayKeyboardStickyContext.Provider>
      </TraySurfaceInteractionContext.Provider>
    </TrayBackdropInteractionContext.Provider>
  );
});

TrayVisualView.displayName = "TrayVisualView";

const localStyles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: TRAY_HEADER_HORIZONTAL_PADDING,
  },
});

export { TrayVisualView };
