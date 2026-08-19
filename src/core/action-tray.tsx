import React, {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
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
import { createTrayLayoutTransition } from "./animation/action-tray-layout";
import { styles as trayStyles } from "./animation/action-tray-styles";
import { TrayOriginProgressProvider } from "./tray-origin-progress";
import { isActionTrayInstrumentationEnabled } from "../telemetry/config";
import { TrayMorphProgressProvider } from "./tray-morph-progress";
import { TrayTransitionStartProvider } from "./transition-start";
import {
  FORWARD_CONTENT_MOTION,
  resolveTrayContentMotionDirection,
  TrayContentMotionDirectionProvider,
  type TrayContentMotionDirection,
} from "./transition-motion-direction";
import { useActionTrayAnimatedStyles } from "./animation/use-action-tray-animated-styles";
import { useTrayBoundaryMotionState } from "./animation/use-tray-boundary-motion-state";
import { useActionTrayGesture } from "./input/use-action-tray-gesture";
import { useActionTrayController } from "./use-action-tray-controller";
import { resolveTransitionEndpointKey } from "./controller/action-tray-sheet-frame";
import {
  HORIZONTAL_MARGIN,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_HEADER_HORIZONTAL_PADDING,
  TRAY_KEYBOARD_GAP,
  TRAY_VERTICAL_PADDING,
} from "./constants";
import {
  ActionTrayProps,
  ActionTrayRef,
} from "./types";

// render one host slot assigned by the presenter
const ActionTray = forwardRef<ActionTrayRef, ActionTrayProps>(
  (
    {
      assignmentId = 0,
      style,
      onClose,
      onCloseComplete,
      rootTrayId,
      content,
      header,
      footer,
      trayId,
      fullScreen,
      fullScreenBackgroundScale,
      fullScreenSafeAreaTop,
      fullScreenDraggable,
      dismissible = true,
      transition,
      transitionContract,
      transitionLifecycle,
      visible,
      interactive = true,
      keyboardTransitionMode = "idle",
      containerStyle,
      className,
      footerClassName,
      footerStyle,
      keyboardHeight: trayKeyboardHeight,
      dismissKeyboard,
    },
    ref,
  ) => {
    const contentMotionDirection =
      useSharedValue<TrayContentMotionDirection>(FORWARD_CONTENT_MOTION);

    useLayoutEffect(() => {
      // Update before passive snapshot publication replaces the keyed subtree.
      // The retained outgoing view and incoming view then read one transaction.
      contentMotionDirection.value =
        resolveTrayContentMotionDirection(transitionContract);
    }, [contentMotionDirection, transitionContract]);

    // keep orchestration in one hook so the tree stays declarative
    const controller = useActionTrayController({
      assignmentId,
      visible,
      interactive,
      keyboardTransitionMode,
      content,
      header,
      footer,
      onCloseComplete,
      rootTrayId,
      trayId,
      fullScreen,
      fullScreenBackgroundScale,
      fullScreenSafeAreaTop,
      fullScreenDraggable,
      transition,
      transitionContract,
      transitionLifecycle,
      containerStyle,
      className,
      footerStyle,
      footerClassName,
      keyboardHeight: trayKeyboardHeight,
      dismissKeyboard,
      onClose,
    });

    const {
      shared: {
        translateY,
        contentHeight,
        footerHeight,
        context,
        hasFooter,
        surfaceOpacity,
        totalHeight,
        progress,
        originProgress,
        morphProgress,
        transitionStartedAt,
        transitionStartedGeneration,
        transitionLayoutStartedGeneration,
        transitionCompletedGeneration,
      },
      state: {
        layoutEnabled,
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
      },
      handlers: {
        handleContentLayout,
        handleVisibleFooterLayout,
        handleMeasureFooterLayout,
        handleShellLayout,
        handleLayoutTransitionConfigured,
        handleLayoutTransitionStart,
        handleLayoutTransitionComplete,
        handleRequestClose,
      },
      imperativeApi,
    } = controller;

    useImperativeHandle(ref, () => imperativeApi, [imperativeApi]);

    const presentationFullScreen = renderedFullScreen;
    const { top: safeAreaTopInset } = useSafeAreaInsets();
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
      keyboardHeight: trayKeyboardHeight,
      dismissKeyboard,
      onRequestClose: handleRequestClose,
    });

    const isFullScreenBoundaryTransition =
      transitionContract?.fullScreenChanged ?? false;
    const shouldUseLayoutAnimation =
      layoutEnabled && !isFullScreenBoundaryTransition;

    const {
      footerSpacerStyle,
      contentBoundarySourceStyle,
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
      hasFooter,
      surfaceOpacity,
      footerHeight,
      keyboardHeight: trayKeyboardHeight,
      frameFullScreen,
      fullScreen: presentationFullScreen,
      preparedSheetFrame,
      visible,
      layoutEnabled,
      originProgress,
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

    // The outer content frame owns presentation geometry. The inner frame owns
    // intrinsic measurement and must never receive the boundary's absolute
    // viewport style; otherwise a fullscreen pass can leave the next sheet
    // body's layout constrained to the old viewport frame and report zero.
    // The fullscreen root needs a bounded flex parent on the snapshot commit;
    // the source viewport style above keeps that parent sheet-sized until the
    // animated boundary frame takes over.
    const contentLayoutStyle = presentationFullScreen
      ? { flex: 1 }
      : undefined;

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
          fullScreenBoundaryTransition: isFullScreenBoundaryTransition,
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
        isFullScreenBoundaryTransition,
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
        morphProgress,
        startedAt: transitionStartedAt,
        startedGeneration: transitionStartedGeneration,
        layoutStartedGeneration: transitionLayoutStartedGeneration,
        completedGeneration: transitionCompletedGeneration,
      }),
      [
        transitionContract?.generation,
        transitionContract?.fullScreenChanged,
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
    // keyboard sticky view wants a closed and opened offset even when the gap is zero
    const keyboardStickyOffset = useMemo(
      () => ({
        closed: 0,
        opened: -TRAY_KEYBOARD_GAP,
      }),
      [],
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
                // Before a fullscreen snapshot commits, the animated style
                // can still contain the previous sheet topology. Let the
                // synchronous source frame win that one native layout pass;
                // once the rendered mode is fullscreen, the animated frame
                // owns the source-to-target handoff.
                ...(isFullScreenBoundaryTransition && !frameFullScreen
                  ? [contentFrameStyle, contentBoundarySourceStyle]
                  : [contentBoundarySourceStyle, contentFrameStyle]),
                contentRevealStyle,
              ]}
            >
              <Animated.View
                style={[
                  contentPaddingStyle,
                  contentLayoutStyle,
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
                        style={[
                          localStyles.headerContainer,
                          headerFrameStyle,
                        ]}
                      >
                        {renderedHeader}
                      </Animated.View>
                    ) : null}
                    {renderedContent}
                  </TrayTransitionStartProvider>
                </TrayContentMotionDirectionProvider>
              </Animated.View>
              {/* reserve footer space; the footer itself is absolute and does not
                  participate in content measurement */}
              <Animated.View style={footerSpacerStyle} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
        {/* Fixed footers intentionally stay outside the layout-animated shell.
            Only a fullscreen boundary may move this layer, and then it follows
            the shell's explicit morph clock rather than content layout. */}
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
          // fullscreen owns the viewport so sheet keyboard stickiness must pause
          <KeyboardStickyView
            enabled={!presentationFullScreen}
            offset={keyboardStickyOffset}
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

ActionTray.displayName = "ActionTray";

export { ActionTray };

const localStyles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: TRAY_HEADER_HORIZONTAL_PADDING,
  },
});
