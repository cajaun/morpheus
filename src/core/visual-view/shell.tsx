import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { TrayContentCommitTargetContext } from "../tray-content-commit";
import { createTrayLayoutTransition } from "../animation/tray-layout";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import { resolveTrayContentMotionDirection } from "../transition-motion-direction";
import { resolveKeyboardSheetTransitionIntent } from "../input/keyboard-transition";
import {
  isSheetFrameForTransition,
  resolveTransitionEndpointKey,
} from "../controller/tray-sheet-frame";
import {
  TrayKeyboardGateContext,
  TrayShellTransitionContext,
  TraySheetFrameProvider,
  type TrayShellTransitionValue,
} from "./contexts";
import {
  areTrayVisualShellPropsEqual,
  type TrayVisualShellProps,
  type TrayBoundaryMotionParams,
  type TraySurfaceProps,
} from "./props";
import { TrayBoundaryMotionRegion } from "./boundary-motion-region";
import { TrayVisualShellContent } from "./shell-content";
import { useShellContentCommitTarget } from "./use-shell-content-commit-target";
import { useShellLayoutPolicyLog } from "./use-shell-layout-policy-log";

// a stable wrapper calls the latest layout handler, native layout events arrive after the commit that rendered them
export const useStableLayoutHandler = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result,
) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  return useCallback((...args: Args) => handlerRef.current(...args), []);
};

// the visual subtree renders apart from the controller host and skips unrelated host commits
export const TrayVisualShell = React.memo(
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
    // committed shell values, TraySurface reads step payloads from the snapshot store
    const renderedHeader = fallbackHeader;
    const renderedFooter = fallbackFooter;
    const renderedContent = fallbackContent;
    const renderedTrayId = fallbackTrayId;
    const renderedFullScreen = fallbackFullScreen;
    const renderedFullScreenBackgroundScale =
      fallbackSnapshotBackgroundScale ?? 1;
    const renderedFullScreenSafeAreaTop = fallbackSafeAreaTop ?? false;
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

    // resolve direction during render so entering and exiting content share one transition snapshot
    const contentMotionDirection =
      resolveTrayContentMotionDirection(transitionContract);
    const presentationFullScreen = renderedFullScreen;
    const isFullScreenBoundaryTransition =
      transitionContract?.fullScreenChanged ?? false;
    const keyboardTransitionIntent =
      resolveKeyboardSheetTransitionIntent(transitionContract);
    const { isSheetStepTransition } = keyboardTransitionIntent;
    const keyboardStepTransition =
      isSheetStepTransition &&
      (keyboardTransitionIntent.sourceOwnsKeyboard ||
        keyboardTransitionIntent.targetOwnsKeyboard);
    const instrumentationEnabled = isTrayInstrumentationEnabled();
    const shouldUseOriginTransition =
      transition?.open === "expandFromTrigger" && !presentationFullScreen;
    // a trigger-origin presentation can enter through a fullscreen parent, so boundary participants mount from the first render
    const requiresFullScreenMotion =
      fullScreenMotionCapable ||
      fullScreen ||
      presentationFullScreen ||
      frameFullScreen ||
      transition?.open === "expandFromTrigger" ||
      transitionContract?.fullScreenChanged === true ||
      transitionContract?.from?.mode === "fullScreen" ||
      transitionContract?.to?.mode === "fullScreen";

    // drag waits for layout and keyboard state
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
    const { contentCommittedGeneration, contentCommitTarget } =
      useShellContentCommitTarget({
        trayId,
        withoutResizeEnabled:
          hasStepContentTransition &&
          shouldUseLayoutAnimation &&
          !isFullScreenBoundaryTransition,
        transitionGeneration: transitionContract?.generation ?? 0,
        transitionStartedAt,
        transitionStartedGeneration,
        transitionLayoutStartedGeneration,
        transitionCompletedGeneration,
        morphProgress,
        keyboardGate,
        onLayoutComplete: handleLayoutTransitionComplete,
      });
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
    // content waits on the barrier when this tray has a shell participant for the generation, the boundary morph or the native sheet layout
    const layoutStartRequired =
      isFullScreenBoundaryTransition ||
      (hasStepContentTransition && shouldUseLayoutAnimation);

    useShellLayoutPolicyLog({
      trayId,
      renderedTrayId,
      assignmentId,
      layoutEnabled,
      shouldUseLayoutAnimation,
      isFullScreenBoundaryTransition,
      fullScreen,
      frameFullScreen,
      presentationFullScreen,
      preparedSheetFrame,
      transitionContract,
    });

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
      fullScreenBoundarySourceFullScreen: transitionContract?.fullScreenChanged
        ? transitionContract.from?.mode === "fullScreen"
        : undefined,
      fullScreenBoundaryTargetFullScreen: transitionContract?.fullScreenChanged
        ? transitionContract.to?.mode === "fullScreen"
        : undefined,
      transitionGeneration: transitionContract?.generation,
      transitionSourceKey: resolveTransitionEndpointKey(
        transitionContract?.from,
      ),
      transitionTargetKey: resolveTransitionEndpointKey(transitionContract?.to),
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
