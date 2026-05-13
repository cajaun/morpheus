import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated, { useDerivedValue } from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { Backdrop } from "../primitives/backdrop";
import { createTrayLayoutTransition } from "./animation/action-tray-layout";
import { styles as trayStyles } from "./animation/action-tray-styles";
import { TrayOriginProgressProvider } from "./tray-origin-progress";
import { useActionTrayAnimatedStyles } from "./animation/use-action-tray-animated-styles";
import { useActionTrayGesture } from "./input/use-action-tray-gesture";
import { useActionTrayController } from "./use-action-tray-controller";
import {
  HORIZONTAL_MARGIN,
  TRAY_HORIZONTAL_PADDING,
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
      },
      state: {
        layoutEnabled,
        isSurfaceReady,
        renderedHeader,
        renderedFooter,
        renderedContent,
        renderedTrayId,
        renderedFullScreen,
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
        handleRequestClose,
      },
      imperativeApi,
    } = controller;

    useImperativeHandle(ref, () => imperativeApi, [imperativeApi]);

    const presentationFullScreen = renderedFullScreen;
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
      trayLayoutStyle,
      footerContainerStyle,
      contentPaddingStyle,
      dragStyle,
      surfaceVisibilityStyle,
      originSurfaceVisibilityStyle,
      contentRevealStyle,
      footerVisibilityStyle,
      footerContentFrameStyle,
      fullScreenSurfaceFillStyle,
    } = useActionTrayAnimatedStyles({
      translateY,
      contentHeight,
      hasFooter,
      surfaceOpacity,
      footerHeight,
      keyboardHeight: trayKeyboardHeight,
      fullScreen: presentationFullScreen,
      visible,
      layoutEnabled,
      originProgress,
      transition,
    });

    const layoutAnimationConfig = useMemo(
      () => createTrayLayoutTransition(),
      [],
    );
    const shouldUseLayoutAnimation = layoutEnabled;
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
              renderedContainerStyle,
              surfaceVisibilityStyle,
              originSurfaceVisibilityStyle,
              dragStyle,
              style,
            ]}
            layout={shouldUseLayoutAnimation ? layoutAnimationConfig : undefined}
          >
            <Animated.View style={[trayStyles.content, contentRevealStyle]}>
              <Animated.View
                style={contentPaddingStyle}
                onLayout={handleContentLayout}
              >
                {renderedHeader ? (
                  <Animated.View style={localStyles.headerContainer}>
                    {renderedHeader}
                  </Animated.View>
                ) : null}
                {renderedContent}
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
    paddingHorizontal: TRAY_HORIZONTAL_PADDING,
  },
});
