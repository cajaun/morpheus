import React, { forwardRef, useImperativeHandle, useMemo } from "react";
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
      visible,
      fullScreen = false,
    },
    ref,
  ) => {
    const controller = useActionTrayController({
      visible,
      content,
      footer,
      trayId,
      fullScreen,
      onClose,
    });

    const {
      shared: {
        translateY,
        footerHeight,
        active,
        context,
        hasFooter,
        animMargin,
        animRadius,
        animBottom,
        animMinHeight,
        animFullScreenBg,
        totalHeight,
        progress,
      },
      state: {
        layoutEnabled,
        footerMeasured,
        renderedFooter,
        renderedContent,
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

    const gesture = useActionTrayGesture({
      fullScreen,
      translateY,
      totalHeight,
      context,
      onRequestClose: handleRequestClose,
    });

    const {
      fullScreenBgStyle,
      footerSpacerStyle,
      containerStyle,
      footerContainerStyle,
      contentPaddingStyle,
      dragStyle,
    } = useActionTrayAnimatedStyles({
      animMargin,
      animRadius,
      animBottom,
      animMinHeight,
      animFullScreenBg,
      translateY,
      hasFooter,
      footerHeight,
    });

    const layoutAnimationConfig = useMemo(
      () => createTrayLayoutTransition(),
      [],
    );

    return (
      <>
        {footer && !footerMeasured && (
          <Animated.View
            style={[
              styles.measureFooter,
              {
                left: HORIZONTAL_MARGIN,
                right: HORIZONTAL_MARGIN,
                paddingHorizontal: TRAY_VERTICAL_PADDING,
                paddingTop: 6,
                paddingBottom: TRAY_VERTICAL_PADDING,
              },
            ]}
            onLayout={handleMeasureFooterLayout}
            pointerEvents="none"
          >
            {footer}
          </Animated.View>
        )}

        <Backdrop
          onTap={handleRequestClose}
          isActive={active}
          progress={progress}
        />

        <Animated.View
          style={[styles.fullScreenBg, fullScreenBgStyle]}
          pointerEvents="none"
        />

        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[styles.container, containerStyle, dragStyle, style]}
            layout={layoutEnabled ? layoutAnimationConfig : undefined}
            onLayout={handleContentLayout}
          >
          <Animated.View style={styles.content}>
  <Animated.View style={contentPaddingStyle}>
    {renderedContent}
  </Animated.View>
  <Animated.View style={footerSpacerStyle} />
</Animated.View>
          </Animated.View>
        </GestureDetector>

        <Animated.View
          onLayout={handleVisibleFooterLayout}
          style={[
            styles.footer,
            footerContainerStyle,
            dragStyle,
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