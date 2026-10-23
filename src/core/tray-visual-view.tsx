import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { KeyboardStickyView } from "react-native-keyboard-controller";
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
    | "isSurfaceReady"
    | "preparedSheetFrame"
    | "renderedHeader"
    | "renderedFooter"
    | "renderedContent"
    | "renderedTrayId"
    | "renderedFullScreen"
    | "renderedFullScreenBackgroundScale"
    | "frameFullScreen"
    | "renderedFullScreenSafeAreaTop"
    | "renderedFullScreenDraggable"
    | "renderedContainerStyle"
    | "renderedClassName"
    | "renderedFooterStyle"
    | "renderedFooterClassName"
  >;
  renderSnapshotStore?: TrayRenderSnapshotStore;
  renderSnapshotOverride?: ReturnType<
    typeof useTrayRenderSnapshot
  >;
  handlers: TrayController["handlers"];
};

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
    gesture: ReturnType<typeof useTrayGesture>;
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
    renderSnapshotOverride?: RenderedTrayState;
    rootTrayId?: string;
    visible: boolean;
    renderedFullScreen: boolean;
    contentMotionDirection: ReturnType<
      typeof resolveTrayContentMotionDirection
    >;
    trayTransitionStart: TrayTransitionStart;
    layoutAnimationConfig: ReturnType<typeof createTrayLayoutTransition>;
    originProgress: TrayController["shared"]["originProgress"];
    instrumentationEnabled: boolean;
    shouldUseLayoutAnimation: boolean;
    interactive: boolean;
    isSurfaceReady: boolean;
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

// Keep the native surface and its content reconciliation behind a second
// boundary. Reanimated shared values continue to update the same animated
// styles on the UI thread; this only skips React work when a controller update
// does not change anything consumed by this surface.
const TraySurface = React.memo(
  ({
    gesture,
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
    renderSnapshotOverride,
    rootTrayId,
    visible,
    renderedFullScreen,
    contentMotionDirection,
    trayTransitionStart,
    layoutAnimationConfig,
    instrumentationEnabled,
    shouldUseLayoutAnimation,
    interactive,
    isSurfaceReady,
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
    const fallbackSnapshot = useMemo<RenderedTrayState>(
      () => ({
        header: renderedHeader,
        content: renderedContent,
        footer: renderedFooter,
        trayId: undefined,
        fullScreen: renderedFullScreen,
        containerStyle: renderedContainerStyle,
        className: renderedClassName,
        footerStyle: renderedFooterStyle,
        footerClassName: renderedFooterClassName,
        transitionContract: null,
      }),
      [
        renderedClassName,
        renderedContainerStyle,
        renderedContent,
        renderedFooter,
        renderedFooterClassName,
        renderedFooterStyle,
        renderedFullScreen,
        renderedHeader,
      ],
    );
    const fallbackSnapshotStore = useMemo<TrayRenderSnapshotStore>(
      () => ({
        getSnapshot: () => fallbackSnapshot,
        subscribe: () => () => {},
        publish: () => {},
      }),
      [fallbackSnapshot],
    );
    const committedSnapshot = useTrayRenderSnapshot(
      renderSnapshotStore ?? fallbackSnapshotStore,
    );
    const preparedSnapshotRef = useRef(renderSnapshotOverride);
    const lastSnapshotOverrideRef = useRef(renderSnapshotOverride);

    if (renderSnapshotOverride !== lastSnapshotOverrideRef.current) {
      lastSnapshotOverrideRef.current = renderSnapshotOverride;
      preparedSnapshotRef.current = renderSnapshotOverride;
    }

    const preparedSnapshot = preparedSnapshotRef.current;
    useLayoutEffect(() => {
      if (
        preparedSnapshot !== undefined &&
        committedSnapshot.trayId === preparedSnapshot.trayId
      ) {
        preparedSnapshotRef.current = undefined;
      }
    }, [committedSnapshot, preparedSnapshot]);

    const renderedSnapshot = preparedSnapshot ?? committedSnapshot;
    const surfaceClassName = renderedSnapshot.className;
    const surfaceContainerStyle = renderedSnapshot.containerStyle;
    const surfaceFooterClassName = renderedSnapshot.footerClassName;
    const surfaceFooterStyle = renderedSnapshot.footerStyle;
    const surfaceHeader = renderedSnapshot.header;
    const surfaceContent = renderedSnapshot.content;
    const surfaceFooter = renderedSnapshot.footer;

    useLayoutEffect(() => {
      // The store remains the commit barrier. Only this memoized surface and
      // its arbitrary slot payload respond to its publication; the parent
      // animation/measurement hook graph does not need to rerender.
      hasFooter.value = surfaceFooter != null;

      if (!visible || renderedSnapshot.trayId === undefined) {
        return;
      }

      markTrayBoundarySnapshotCommitted(
        rootTrayId,
        renderedSnapshot.transitionContract,
        renderedSnapshot.trayId,
      );
      markTrayStepRenderedCommit(
        rootTrayId,
        renderedSnapshot.trayId,
        renderedSnapshot.transitionContract?.generation,
      );
    }, [
      hasFooter,
      renderedSnapshot,
      rootTrayId,
      surfaceFooter,
      visible,
    ]);

    return (
    <>
      <GestureDetector gesture={gesture}>
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
                        <TrayRenderedNode node={surfaceHeader} />
                      </Animated.View>
                    ) : null}
                    <TrayRenderedNode node={surfaceContent} />
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
          surfaceFooter && interactive && isSurfaceReady ? "auto" : "none"
        }
      >
        <Animated.View style={footerContentFrameStyle}>
          <TrayOriginProgressProvider value={originProgress}>
            <TrayRenderedNode node={surfaceFooter ?? null} />
          </TrayOriginProgressProvider>
        </Animated.View>
      </Animated.View>
    </>
    );
  },
);

TraySurface.displayName = "TraySurface";

// Own the visual/native subtree separately from the controller host. The
// controller must still run for lifecycle and measurement state, but stable
// controller identities let this component skip unrelated host commits.
const TrayVisualView = React.memo(
  ({
    assignmentId = 0,
    style,
    rootTrayId,
    trayId,
    fullScreen,
    dismissible = true,
    transition,
    transitionContract,
    visible,
    interactive = true,
    keyboardAware,
    shared,
    state,
    renderSnapshotStore,
    renderSnapshotOverride,
    handlers,
  }: TrayVisualViewProps) => {
    const {
      translateY,
      contentHeight,
      footerHeight,
      context,
      hasFooter,
      surfaceOpacity,
      totalHeight,
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
      isSurfaceReady,
      preparedSheetFrame,
      renderedHeader: fallbackHeader,
      renderedFooter: fallbackFooter,
      renderedContent: fallbackContent,
      renderedTrayId: fallbackTrayId,
      renderedFullScreen: fallbackFullScreen,
      renderedFullScreenBackgroundScale: fallbackSnapshotBackgroundScale,
      frameFullScreen,
      renderedFullScreenSafeAreaTop: fallbackSafeAreaTop,
      renderedFullScreenDraggable: fallbackDraggable,
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
    const renderedFullScreenDraggable =
      fallbackDraggable ?? true;
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
      handleRequestClose,
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
    const { isSheetStepTransition, targetOwnsKeyboard } =
      keyboardTransitionIntent;
    const keyboardStepTransition =
      keyboardTransitionIntent.isSheetStepTransition &&
      (keyboardTransitionIntent.sourceOwnsKeyboard ||
        keyboardTransitionIntent.targetOwnsKeyboard);
    const targetKeyboardAware =
      isSheetStepTransition && targetOwnsKeyboard;
    const keyboard = useSheetTrayKeyboard({
      rootTrayId,
      visible,
      keyboardAware: !fullScreen && (keyboardAware ?? false),
      targetKeyboardAware,
      sheetStepTransition: isSheetStepTransition,
      transitionGeneration: transitionContract?.generation,
    });
    const providerBackgroundScale = useTrayBackgroundScale();
    const fallbackBackgroundScale = useSharedValue(1);
    // nested test shells may render without a provider so keep a local scale value
    const backgroundScale =
      providerBackgroundScale ?? fallbackBackgroundScale;
    const instrumentationEnabled = isTrayInstrumentationEnabled();
    const shouldUseOriginTransition =
      transition?.open === "expandFromTrigger" && !presentationFullScreen;
    // backdrop follows origin progress only for trigger expansion so opacity waits for the shell
    const originBackdropProgress = useDerivedValue(
      () => originProgress.value * progress.value,
    );
    const backdropProgress = shouldUseOriginTransition
      ? originBackdropProgress
      : progress;

    // wait for layout and keyboard state before drag starts
    const gesture = useTrayGesture({
      translateY,
      totalHeight,
      context,
      interactive: interactive && isSurfaceReady && dismissible,
      fullScreen: presentationFullScreen,
      fullScreenDraggable: renderedFullScreenDraggable,
      onRequestClose: handleRequestClose,
    });

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
      log("KEYBOARD STEP CLASSIFICATION", {
        trayId,
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
      trayId,
      transitionContract,
      visible,
    ]);

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
            interactive,
          },
        ),
      [
        assignmentId,
        interactive,
        rootTrayId,
        shellId,
        trayId,
        visible,
      ],
    );

    const shell = (
      <TrayMorphProgressProvider value={morphProgress}>
        <Backdrop
          onTap={dismissible ? handleRequestClose : () => {}}
          isRendered={renderedTrayId !== undefined}
          interactive={interactive}
          progress={backdropProgress}
        />

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
          <KeyboardStickyView
            enabled={
              !presentationFullScreen &&
              !isFullScreenBoundaryTransition &&
              keyboard.stickyEnabled
            }
            offset={{ opened: TRAY_KEYBOARD_GAP }}
            pointerEvents="box-none"
            style={StyleSheet.absoluteFillObject}
          >
            <TraySurface
              gesture={gesture}
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
              renderSnapshotOverride={renderSnapshotOverride}
              rootTrayId={rootTrayId}
              visible={visible}
              renderedFullScreen={presentationFullScreen}
              contentMotionDirection={contentMotionDirection}
              trayTransitionStart={trayTransitionStart}
              layoutAnimationConfig={layoutAnimationConfig}
              instrumentationEnabled={instrumentationEnabled}
              shouldUseLayoutAnimation={shouldUseLayoutAnimation}
              interactive={interactive}
              isSurfaceReady={isSurfaceReady}
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
          </KeyboardStickyView>
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
);

TrayVisualView.displayName = "TrayVisualView";

const localStyles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: TRAY_HEADER_HORIZONTAL_PADDING,
  },
});

export { TrayVisualView };
