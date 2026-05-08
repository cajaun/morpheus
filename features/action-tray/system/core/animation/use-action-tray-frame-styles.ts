import {
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  BORDER_RADIUS,
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  HORIZONTAL_MARGIN,
  MORPH_DURATION,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_VERTICAL_PADDING,
} from "../constants";
import type {
  ActionTrayAnimatedStyleParams,
  ActionTrayAnimationState,
} from "./action-tray-animated-style-types";

const EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT / 2;

type Params = Pick<
  ActionTrayAnimatedStyleParams,
  "contentHeight" | "footerHeight" | "hasFooter" | "keyboardHeight" | "transition"
> &
  ActionTrayAnimationState;

export const useActionTrayFrameStyles = ({
  bottom,
  contentHeight,
  footerHeight,
  fullScreen,
  hasFooter,
  keyboardHeight,
  originProgress,
  shouldUseOriginTransition,
  transition,
}: Params) => {
  const collapsedBottomInset =
    transition?.origin === "fullScreenFooter"
      ? TRAY_VERTICAL_PADDING
      : EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET;
  const targetBottomInset =
    transition?.origin === "fullScreenFooter" ? collapsedBottomInset : 0;

  const footerSpacerStyle = useAnimatedStyle(() => ({
    height: hasFooter.value ? footerHeight.value : 0,
  }));

  const trayLayoutStyle = useAnimatedStyle(() => {
    const resolvedSheetHeight =
      contentHeight.value > 0
        ? Math.max(
            0,
            contentHeight.value + (hasFooter.value ? footerHeight.value : 0),
          )
        : undefined;
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom = fullScreen ? 0 : bottom + targetBottomInset;
    const targetRadius = fullScreen ? 0 : BORDER_RADIUS;
    const targetTop = fullScreen
      ? 0
      : resolvedSheetHeight === undefined
        ? undefined
        : SCREEN_HEIGHT - targetBottom - resolvedSheetHeight;

    if (shouldUseOriginTransition && targetTop !== undefined) {
      const progress = originProgress.value;
      const targetWidth = SCREEN_WIDTH - targetLeft - targetRight;
      const collapsedTop =
        SCREEN_HEIGHT -
        (bottom + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        left: targetLeft,
        top: interpolate(progress, [0, 1], [collapsedTop, targetTop]),
        width: targetWidth,
        height: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
          resolvedSheetHeight ?? EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
        ]),
        bottom: "auto",
        right: "auto",
        borderRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          targetRadius,
        ]),
      };
    }

    return {
      left: targetLeft,
      right: targetRight,
      bottom: targetBottom,
      top: fullScreen ? 0 : "auto",
      height: fullScreen ? SCREEN_HEIGHT : resolvedSheetHeight,
      borderRadius: BORDER_RADIUS,
    };
  }, [
    bottom,
    collapsedBottomInset,
    contentHeight,
    fullScreen,
    originProgress,
    shouldUseOriginTransition,
    targetBottomInset,
  ]);

  const footerContainerStyle = useAnimatedStyle(() => {
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom =
      !shouldUseOriginTransition && keyboardHeight.value > 0
        ? keyboardHeight.value
        : bottom + targetBottomInset;
    const targetRadius = fullScreen ? 0 : BORDER_RADIUS;

    if (shouldUseOriginTransition) {
      const progress = originProgress.value;
      const revealProgress = progress * progress;
      const targetWidth = SCREEN_WIDTH - targetLeft - targetRight;
      const currentHorizontalInset = interpolate(revealProgress, [0, 1], [
        EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
        TRAY_VERTICAL_PADDING,
      ]);
      const targetFooterHeight =
        footerHeight.value > 0
          ? footerHeight.value
          : EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;
      const targetTop =
        SCREEN_HEIGHT - targetBottom - targetFooterHeight;
      const collapsedTop =
        SCREEN_HEIGHT -
        (bottom + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        left: targetLeft,
        top: interpolate(progress, [0, 1], [collapsedTop, targetTop]),
        width: targetWidth,
        minHeight: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
          targetFooterHeight,
        ]),
        paddingHorizontal: 0,
        paddingLeft: currentHorizontalInset,
        paddingRight: currentHorizontalInset,
        paddingTop: interpolate(revealProgress, [0, 1], [0, 6]),
        paddingBottom: interpolate(revealProgress, [0, 1], [
          0,
          TRAY_VERTICAL_PADDING,
        ]),
        backgroundColor: "transparent",
        right: "auto",
        bottom: "auto",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          targetRadius,
        ]),
        borderBottomRightRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          targetRadius,
        ]),
      };
    }

    return {
      left: targetLeft,
      right: targetRight,
      bottom: withTiming(targetBottom, { duration: MORPH_DURATION }),
      borderTopLeftRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
      borderTopRightRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
      borderBottomLeftRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
      borderBottomRightRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
    };
  }, [
    bottom,
    collapsedBottomInset,
    footerHeight,
    fullScreen,
    keyboardHeight,
    originProgress,
    shouldUseOriginTransition,
    targetBottomInset,
  ]);

  return {
    footerSpacerStyle,
    trayLayoutStyle,
    footerContainerStyle,
  };
};
