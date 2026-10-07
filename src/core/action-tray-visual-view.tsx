import React, { useEffect, useMemo } from "react";
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
import { createTrayLayoutTransition } from "./animation/action-tray-layout";
import { styles as trayStyles } from "./animation/action-tray-styles";
import { TrayOriginProgressProvider } from "./tray-origin-progress";
import { isActionTrayInstrumentationEnabled } from "../telemetry/config";
import { TrayMorphProgressProvider } from "./tray-morph-progress";
import { TrayTransitionStartProvider } from "./transition-start";
import {
  resolveTrayContentMotionDirection,
  TrayContentMotionDirectionProvider,
} from "./transition-motion-direction";
import { useActionTrayAnimatedStyles } from "./animation/use-action-tray-animated-styles";
import { useTrayBoundaryMotionState } from "./animation/use-tray-boundary-motion-state";
import { useActionTrayGesture } from "./input/use-action-tray-gesture";
import { useSheetActionTrayKeyboard } from "./input/use-action-tray-keyboard";
import { resolveKeyboardSheetTransitionIntent } from "./input/keyboard-transition";
import type { ActionTrayController } from "./use-action-tray-controller";
import {
  isSheetFrameForTransition,
  resolveTransitionEndpointKey,
} from "./controller/action-tray-sheet-frame";
import { describeTrayTransition } from "./diagnostics/action-tray-transition-diagnostics";
import { log } from "./logger";
import {
  HORIZONTAL_MARGIN,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_HEADER_HORIZONTAL_PADDING,
  TRAY_KEYBOARD_GAP,
  TRAY_VERTICAL_PADDING,
} from "./constants";
import type { ActionTrayProps } from "./types";

type ActionTrayVisualViewProps = Pick<
  ActionTrayProps,
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
  shared: ActionTrayController["shared"];
  state: ActionTrayController["state"];
  handlers: ActionTrayController["handlers"];
};

// Own the visual/native subtree separately from the controller host. The
// controller must still run for lifecycle and measurement state, but stable
// controller identities let this component skip unrelated host commits.
const ActionTrayVisualView = React.memo(
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
    handlers,
  }: ActionTrayVisualViewProps) => {
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
      renderedHeader,
      renderedFooter,
      renderedContent,
      renderedTrayId,
      renderedFullScreen,
      renderedFullScreenBackgroundScale,
      frameFullScreen,
      renderedFullScreenSafeAreaTop,
      renderedFullScreenDraggable,
      renderedContainerStyle,
      renderedClassName,
      renderedFooterStyle,
      renderedFooterClassName,
      measureFooter,
    } = state;
    const {
      handleContentLayout,
      handleVisibleFooterLayout,
      handleMeasureFooterLayout,
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
    const keyboard = useSheetActionTrayKeyboard({
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
    const instrumentationEnabled = isActionTrayInstrumentationEnabled();
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
    const gesture = useActionTrayGesture({
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
    } = useActionTrayAnimatedStyles({
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
    const traySurface = (
      <>
        <GestureDetector gesture={gesture}>
          <Animated.View
            className={renderedClassName}
            style={[
              trayStyles.container,
              trayLayoutStyle,
              presentationFrameStyle,
              renderedContainerStyle,
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
                onLayout={handleContentLayout}
              >
                <TrayContentMotionDirectionProvider
                  value={contentMotionDirection}
                >
                  <TrayTransitionStartProvider value={trayTransitionStart}>
                    {renderedHeader ? (
                      <Animated.View
                        style={[localStyles.headerContainer, headerFrameStyle]}
                      >
                        {renderedHeader}
                      </Animated.View>
                    ) : null}
                    {renderedContent}
                  </TrayTransitionStartProvider>
                </TrayContentMotionDirectionProvider>
              </Animated.View>
              {/* reserve footer space the footer itself is absolute and does not participate in content measurement */}
              <Animated.View style={footerSpacerStyle} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
        {/* fixed footers stay outside the layout animated shell only a fullscreen boundary may move this layer and then it follows the shell s explicit morph clock rather than content layout */}
        <Animated.View
          className={renderedFooterClassName}
          onLayout={handleVisibleFooterLayout}
          style={[
            trayStyles.footer,
            dragStyle,
            renderedFooterStyle,
            footerContainerStyle,
            footerVisibilityStyle,
          ]}
          pointerEvents={
            renderedFooter && interactive && isSurfaceReady ? "auto" : "none"
          }
        >
          <Animated.View style={footerContentFrameStyle}>
            <TrayOriginProgressProvider value={originProgress}>
              {renderedFooter ?? null}
            </TrayOriginProgressProvider>
          </Animated.View>
        </Animated.View>
      </>
    );

    return (
      <TrayMorphProgressProvider value={morphProgress}>
        {measureFooter && (
          <Animated.View
            style={[
              trayStyles.measureFooter,
              {
                left: presentationFullScreen ? 0 : HORIZONTAL_MARGIN,
                right: presentationFullScreen ? 0 : HORIZONTAL_MARGIN,
                paddingHorizontal: TRAY_VERTICAL_PADDING,
                paddingTop: TRAY_FOOTER_PADDING_TOP,
                paddingBottom: TRAY_FOOTER_PADDING_BOTTOM,
              },
            ]}
            onLayout={handleMeasureFooterLayout}
            pointerEvents="none"
          >
            <TrayOriginProgressProvider value={originProgress}>
              {measureFooter}
            </TrayOriginProgressProvider>
          </Animated.View>
        )}

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
            {traySurface}
          </KeyboardStickyView>
        )}
      </TrayMorphProgressProvider>
    );
  },
);

ActionTrayVisualView.displayName = "ActionTrayVisualView";

const localStyles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: TRAY_HEADER_HORIZONTAL_PADDING,
  },
});

export { ActionTrayVisualView };
