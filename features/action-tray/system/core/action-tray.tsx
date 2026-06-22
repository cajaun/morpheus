import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
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
import { FullScreenTransitionStartProvider } from "./full-screen-transition-start";
import { useActionTrayAnimatedStyles } from "./animation/use-action-tray-animated-styles";
import { useActionTrayGesture } from "./input/use-action-tray-gesture";
import { useActionTrayController } from "./use-action-tray-controller";
import {
  FULL_SCREEN_HEADER_BOTTOM_GAP,
  FULL_SCREEN_HEADER_HORIZONTAL_PADDING,
  HORIZONTAL_MARGIN,
  TRAY_HEADER_HORIZONTAL_PADDING,
  TRAY_KEYBOARD_GAP,
  TRAY_VERTICAL_PADDING,
} from "./constants";
import {
  ActionTrayProps,
  ActionTrayRef,
} from "./action-tray-types";

// this component renders one host slot
// the presenter decides which tray payload this slot carries
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
    // keep orchestration in one hook so the view tree stays declarative
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
        fullScreenLayoutStartedAt,
        layoutStartedFullScreenGeneration,
      },
      state: {
        layoutEnabled,
        isSurfaceReady,
        preparedSheetFrameHeight,
        renderedHeader,
        renderedFooter,
        renderedContent,
        renderedTrayId,
        renderedFullScreen,
        renderedFullScreenBackgroundScale,
        fullScreenTransitionGeneration,
        frameFullScreen,
        renderedFullScreenSafeAreaTop,
        renderedFullScreenDraggable,
        renderedContainerStyle,
        renderedClassName,
        renderedFooterStyle,
        renderedFooterClassName,
        measureFooter,
        useMeasuredSheetHeight,
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
    const backgroundScale =
      providerBackgroundScale ?? fallbackBackgroundScale;
    const fullScreenBackgroundScaleTarget = presentationFullScreen
      ? renderedFullScreenBackgroundScale
      : 1;
    const fullScreenBackgroundMorphScale = useSharedValue(
      fullScreenBackgroundScaleTarget,
    );
    const fullScreenSafeAreaTopTarget =
      presentationFullScreen && renderedFullScreenSafeAreaTop
        ? safeAreaTopInset
        : 0;
    const fullScreenSafeAreaTopHeight = useSharedValue(
      fullScreenSafeAreaTopTarget,
    );
    const fullScreenSurfaceFillOpacityTarget = presentationFullScreen ? 1 : 0;
    const fullScreenSurfaceFillOpacity = useSharedValue(
      fullScreenSurfaceFillOpacityTarget,
    );
    const fullScreenLayoutActiveRef = useRef(false);
    const previousPresentationFullScreenRef = useRef(
      presentationFullScreen,
    );
    const fullScreenSafeAreaContentStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: fullScreenSafeAreaTopHeight.value },
      ],
    }));
    const fullScreenSurfaceFillStyle = useAnimatedStyle(() => ({
      opacity: fullScreenSurfaceFillOpacity.value,
    }));
    useAnimatedReaction(
      () => ({
        morphScale: fullScreenBackgroundMorphScale.value,
        visibility: progress.value,
      }),
      ({ morphScale, visibility }) => {
        backgroundScale.value =
          1 + (morphScale - 1) * visibility;
      },
      [backgroundScale, fullScreenBackgroundMorphScale, progress],
    );
    const instrumentationEnabled = isActionTrayInstrumentationEnabled();
    const shouldUseOriginTransition =
      transition?.open === "expandFromTrigger" && !presentationFullScreen;
    const originBackdropProgress = useDerivedValue(
      () => originProgress.value * progress.value,
    );
    const backdropProgress = shouldUseOriginTransition
      ? originBackdropProgress
      : progress;

    // drag should not start before layout and keyboard state settle
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

    const {
      footerSpacerStyle,
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
      preparedSheetFrameHeight,
      useMeasuredSheetHeight,
      visible,
      layoutEnabled,
      originProgress,
      transition,
    });

    const shouldUseLayoutAnimation = layoutEnabled;
    useLayoutEffect(() => {
      const presentationModeChanged =
        previousPresentationFullScreenRef.current !==
        presentationFullScreen;
      previousPresentationFullScreenRef.current = presentationFullScreen;

      if (presentationModeChanged && shouldUseLayoutAnimation) {
        fullScreenLayoutActiveRef.current = true;
        if (!presentationFullScreen) {
          fullScreenSurfaceFillOpacity.value = 0;
        }
        return;
      }

      if (!fullScreenLayoutActiveRef.current) {
        fullScreenSafeAreaTopHeight.value =
          fullScreenSafeAreaTopTarget;
        fullScreenBackgroundMorphScale.value =
          fullScreenBackgroundScaleTarget;
        fullScreenSurfaceFillOpacity.value =
          fullScreenSurfaceFillOpacityTarget;
      }
    }, [
      fullScreenBackgroundMorphScale,
      fullScreenBackgroundScaleTarget,
      fullScreenSafeAreaTopHeight,
      fullScreenSafeAreaTopTarget,
      fullScreenSurfaceFillOpacity,
      fullScreenSurfaceFillOpacityTarget,
      presentationFullScreen,
      shouldUseLayoutAnimation,
    ]);
    const handleSynchronizedLayoutTransitionComplete = useCallback(
      (finishedAt: number) => {
        fullScreenLayoutActiveRef.current = false;
        handleLayoutTransitionComplete(finishedAt);
      },
      [handleLayoutTransitionComplete],
    );
    const layoutAnimationConfig = useMemo(
      () =>
        createTrayLayoutTransition({
          fullScreenTransitionGeneration,
          layoutStartedAt: fullScreenLayoutStartedAt,
          layoutStartedFullScreenGeneration,
          fullScreenBackgroundScale: fullScreenBackgroundMorphScale,
          fullScreenBackgroundScaleTarget,
          fullScreenSafeAreaTop: fullScreenSafeAreaTopHeight,
          fullScreenSafeAreaTopTarget,
          fullScreenSurfaceFillOpacity,
          fullScreenSurfaceFillOpacityTarget,
          onConfigure: instrumentationEnabled
            ? handleLayoutTransitionConfigured
            : undefined,
          onStart: instrumentationEnabled
            ? handleLayoutTransitionStart
            : undefined,
          onComplete: handleSynchronizedLayoutTransitionComplete,
        }),
      [
        fullScreenTransitionGeneration,
        fullScreenBackgroundMorphScale,
        fullScreenBackgroundScaleTarget,
        fullScreenSafeAreaTopHeight,
        fullScreenSafeAreaTopTarget,
        fullScreenSurfaceFillOpacity,
        fullScreenSurfaceFillOpacityTarget,
        fullScreenLayoutStartedAt,
        handleLayoutTransitionConfigured,
        handleSynchronizedLayoutTransitionComplete,
        handleLayoutTransitionStart,
        instrumentationEnabled,
        layoutStartedFullScreenGeneration,
      ],
    );
    const fullScreenTransitionStart = useMemo(
      () => ({
        enabled: shouldUseLayoutAnimation,
        generation: fullScreenTransitionGeneration,
        startedAt: fullScreenLayoutStartedAt,
        startedGeneration: layoutStartedFullScreenGeneration,
      }),
      [
        fullScreenTransitionGeneration,
        fullScreenLayoutStartedAt,
        layoutStartedFullScreenGeneration,
        shouldUseLayoutAnimation,
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
            <Animated.View style={[trayStyles.content, contentRevealStyle]}>
              <Animated.View
                style={[
                  contentPaddingStyle,
                  fullScreenSafeAreaContentStyle,
                ]}
                onLayout={handleContentLayout}
              >
                <FullScreenTransitionStartProvider
                  value={fullScreenTransitionStart}
                >
                  {renderedHeader ? (
                    <Animated.View
                      style={[
                        localStyles.headerContainer,
                        presentationFullScreen &&
                          localStyles.fullScreenHeaderContainer,
                      ]}
                    >
                      {renderedHeader}
                    </Animated.View>
                  ) : null}
                  {renderedContent}
                </FullScreenTransitionStartProvider>
              </Animated.View>
              {/* reserve space for the detached footer without coupling body layout to footer rendering */}
              <Animated.View style={footerSpacerStyle} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
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
      <>
        {measureFooter && (
          
          <Animated.View
            style={[
              trayStyles.measureFooter,
              {
                left: presentationFullScreen ? 0 : HORIZONTAL_MARGIN,
                right: presentationFullScreen ? 0 : HORIZONTAL_MARGIN,
                paddingHorizontal: TRAY_VERTICAL_PADDING,
                paddingTop: 6,
                paddingBottom: TRAY_VERTICAL_PADDING,
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
          <KeyboardStickyView
            enabled={!presentationFullScreen}
            offset={keyboardStickyOffset}
            pointerEvents="box-none"
            style={StyleSheet.absoluteFillObject}
          >
            {traySurface}
          </KeyboardStickyView>
        )}
      </>
    );
  },
);

ActionTray.displayName = "ActionTray";

export { ActionTray };

const localStyles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: TRAY_HEADER_HORIZONTAL_PADDING,
    // position: "relative",
    // zIndex: 1,
  },
  fullScreenHeaderContainer: {
    // Fullscreen chrome owns the gap between its header controls and body.
    // Tray.Section then supplies its independent content inset.
    paddingHorizontal: FULL_SCREEN_HEADER_HORIZONTAL_PADDING,
    paddingBottom: FULL_SCREEN_HEADER_BOTTOM_GAP,
  },
});
