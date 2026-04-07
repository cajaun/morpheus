import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { Backdrop } from "../primitives/backdrop";
import { createTrayLayoutTransition } from "./animation/action-tray-layout";
import { styles } from "./animation/action-tray-styles";
import { useActionTrayAnimatedStyles } from "./animation/use-action-tray-animated-styles";
import { useActionTrayGesture } from "./input/use-action-tray-gesture";
import { useActionTrayController } from "./use-action-tray-controller";
import { HORIZONTAL_MARGIN, TRAY_VERTICAL_PADDING } from "./constants";
import { ActionTrayProps, ActionTrayRef } from "./action-tray-types";

const ActionTray = forwardRef<ActionTrayRef, ActionTrayProps>(
  (
    {
      style,
      onClose,
      onCloseComplete,
      rootTrayId,
      content,
      footer,
      trayId,
      fullScreen,
      fullScreenDraggable,
      visible,
      interactive = true,
      containerStyle,
      className,
      footerClassName,
      footerStyle,
      keyboardHeight: trayKeyboardHeight,
      dismissKeyboard,
    },
    ref,
  ) => {
    const controller = useActionTrayController({
      visible,
      interactive,
      content,
      footer,
      onCloseComplete,
      rootTrayId,
      trayId,
      fullScreen,
      fullScreenDraggable,
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
      },
      state: {
        layoutEnabled,
        isSurfaceReady,
        renderedFooter,
        renderedContent,
        renderedTrayId,
        renderedFullScreen,
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

    const gesture = useActionTrayGesture({
      translateY,
      totalHeight,
      context,
      interactive: interactive && isSurfaceReady,
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
      footerVisibilityStyle,
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

    return (
      <>
        {measureFooter && (
          <Animated.View
            style={[
              styles.measureFooter,
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
            {measureFooter}
          </Animated.View>
        )}

        <Backdrop
          onTap={handleRequestClose}
          isRendered={renderedTrayId !== undefined}
          interactive={interactive}
          progress={progress}
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

        <GestureDetector gesture={gesture}>
          <Animated.View
            className={renderedClassName}
            style={[
              styles.container,
              trayLayoutStyle,
              renderedContainerStyle,
              surfaceVisibilityStyle,
              dragStyle,
              style,
            ]}
            layout={shouldUseLayoutAnimation ? layoutAnimationConfig : undefined}
          >
            <Animated.View style={styles.content}>
              <Animated.View
                style={contentPaddingStyle}
                onLayout={handleContentLayout}
              >
                {renderedContent}
              </Animated.View>
              <Animated.View style={footerSpacerStyle} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        <Animated.View
          className={renderedFooterClassName}
          onLayout={handleVisibleFooterLayout}
          style={[
            styles.footer,
            footerContainerStyle,
            dragStyle,
            renderedFooterStyle,
            footerVisibilityStyle,
          ]}
          pointerEvents={
            renderedFooter && interactive && isSurfaceReady ? "auto" : "none"
          }
        >
          {renderedFooter ?? null}
        </Animated.View>
      </>
    );
  },
);

ActionTray.displayName = "ActionTray";

export { ActionTray };
