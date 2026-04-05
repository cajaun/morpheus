import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { Backdrop } from "../primitives/backdrop";
import { useActionTrayController } from "./use-action-tray-controller";
import { useActionTrayGesture } from "./use-action-tray-gesture";
import { useActionTrayAnimatedStyles } from "./use-action-tray-animated-styles";
import { createTrayLayoutTransition } from "./action-tray-layout";
import { styles } from "./action-tray-styles";
import { HORIZONTAL_MARGIN, TRAY_VERTICAL_PADDING } from "./constants";
import { ActionTrayProps, ActionTrayRef } from "./action-tray-types";

const ActionTray = forwardRef<ActionTrayRef, ActionTrayProps>(
  (
    {
      style,
      onClose,
      content,
      footer,
      trayId,
      fullScreen,
      fullScreenDraggable,
      visible,
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
      content,
      footer,
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
        totalHeight,
        progress,
      },
      state: {
        layoutEnabled,
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
      fullScreenSurfaceFillStyle,
    } = useActionTrayAnimatedStyles({
      translateY,
      contentHeight,
      hasFooter,
      footerHeight,
      keyboardHeight: trayKeyboardHeight,
      fullScreen: presentationFullScreen,
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
            { opacity: renderedFooter ? 1 : 0 },
          ]}
          pointerEvents={renderedFooter ? "auto" : "none"}
        >
          {renderedFooter ?? null}
        </Animated.View>
      </>
    );
  },
);

ActionTray.displayName = "ActionTray";

export { ActionTray };
