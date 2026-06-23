import {
  Easing,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  BORDER_RADIUS,
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  FULL_SCREEN_LAYOUT_DURATION,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_VERTICAL_PADDING,
} from "../constants";
import type {
  ActionTrayAnimatedStyleParams,
  ActionTrayAnimationState,
} from "./action-tray-animated-style-types";

const EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT / 2;

const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING =
  TRAY_FOOTER_PADDING_TOP;

const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT +
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING +
  TRAY_FOOTER_PADDING_BOTTOM;

const FULL_SCREEN_FRAME_EASING = Easing.bezier(0, 0, 0.58, 1);

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
  preparedSheetFrameHeight,
  shouldUseOriginTransition,
  transition,
  useMeasuredSheetHeight,
}: Params) => {
  // footer-origin transitions begin at the footer edge instead of screen bottom
  const collapsedBottomInset =
    transition?.origin === "fullScreenFooter"
      ? TRAY_FOOTER_PADDING_BOTTOM
      : EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET;
  const targetBottomInset =
    transition?.origin === "fullScreenFooter" ? collapsedBottomInset : 0;
  // keep presentation frame props concrete during keyed content swaps
  const presentationFrameStyle = fullScreen
    ? {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        height: SCREEN_HEIGHT,
      }
    : useMeasuredSheetHeight && preparedSheetFrameHeight !== undefined
      ? {
          left: HORIZONTAL_MARGIN,
          right: HORIZONTAL_MARGIN,
          top: "auto" as const,
          bottom: bottom + targetBottomInset,
          height: preparedSheetFrameHeight,
        }
      : undefined;

  const footerSpacerStyle = useAnimatedStyle(() => ({
    // detached footers still need to reserve body space for layout height
    height: hasFooter.value
      ? shouldUseOriginTransition
        ? EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT
        : footerHeight.value
      : 0,
  }));

  const trayLayoutStyle = useAnimatedStyle(() => {
    const resolvedFooterHeight = hasFooter.value
      ? shouldUseOriginTransition
        ? EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT
        : footerHeight.value
      : 0;
    const resolvedSheetHeight =
      contentHeight.value > 0
        ? Math.max(0, contentHeight.value + resolvedFooterHeight)
        : undefined;
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom = fullScreen ? 0 : bottom + targetBottomInset;
    // keep the same rounded shell while fullscreen expands the frame
    const targetRadius = BORDER_RADIUS;
    const targetTop = fullScreen
      ? 0
      : resolvedSheetHeight === undefined
        ? undefined
        : SCREEN_HEIGHT - targetBottom - resolvedSheetHeight;

    if (shouldUseOriginTransition && targetTop !== undefined) {
      // trigger expansion owns left width top height and radius as one interpolation
      const progress = originProgress.value;
      const targetWidth = SCREEN_WIDTH - targetLeft - targetRight;
      const currentLeft = interpolate(progress, [0, 1], [
        EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
        targetLeft,
      ]);
      const currentWidth = interpolate(progress, [0, 1], [
        SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2,
        targetWidth,
      ]);
      const collapsedTop =
        SCREEN_HEIGHT -
        (bottom + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        left: currentLeft,
        top: interpolate(progress, [0, 1], [collapsedTop, targetTop]),
        width: currentWidth,
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
      // let regular sheets derive geometry from children
      height: fullScreen
        ? SCREEN_HEIGHT
        : useMeasuredSheetHeight
          ? resolvedSheetHeight
          // restore yoga height ownership after concrete fullscreen heights
          : "auto",
      borderRadius: targetRadius,
    };
  }, [
    bottom,
    collapsedBottomInset,
    contentHeight,
    fullScreen,
    originProgress,
    shouldUseOriginTransition,
    targetBottomInset,
    useMeasuredSheetHeight,
  ]);

  const footerContainerStyle = useAnimatedStyle(() => {
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom =
      !shouldUseOriginTransition && keyboardHeight.value > 0
        ? keyboardHeight.value
        : bottom + targetBottomInset;
    const targetRadius = BORDER_RADIUS;

    if (shouldUseOriginTransition) {
      // footer reveal uses squared progress so the button width settles before padding
      const progress = originProgress.value;
      const revealProgress = progress * progress;
      const targetWidth = SCREEN_WIDTH - targetLeft - targetRight;
      const currentLeft = interpolate(progress, [0, 1], [
        EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
        targetLeft,
      ]);
      const currentWidth = interpolate(progress, [0, 1], [
        SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2,
        targetWidth,
      ]);
      const currentHorizontalInset = interpolate(revealProgress, [0, 1], [
        EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
        TRAY_VERTICAL_PADDING,
      ]);
      const targetFooterHeight = EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT;
      const targetTop = SCREEN_HEIGHT - targetBottom - targetFooterHeight;
      const collapsedTop =
        SCREEN_HEIGHT -
        (bottom + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        left: currentLeft,
        top: interpolate(progress, [0, 1], [collapsedTop, targetTop]),
        width: currentWidth,
        height: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
          targetFooterHeight,
        ]),
        paddingHorizontal: 0,
        paddingLeft: currentHorizontalInset,
        paddingRight: currentHorizontalInset,
        paddingTop: interpolate(revealProgress, [0, 1], [
          0,
          EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING,
        ]),
        paddingBottom: interpolate(revealProgress, [0, 1], [
          0,
          TRAY_FOOTER_PADDING_BOTTOM,
        ]),
        right: "auto",
        bottom: "auto",
        borderTopLeftRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          0,
        ]),
        borderTopRightRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          0,
        ]),
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
      // keep the detached footer on the same fullscreen geometry clock
      left: withTiming(targetLeft, {
        duration: FULL_SCREEN_LAYOUT_DURATION,
        easing: FULL_SCREEN_FRAME_EASING,
      }),
      right: withTiming(targetRight, {
        duration: FULL_SCREEN_LAYOUT_DURATION,
        easing: FULL_SCREEN_FRAME_EASING,
      }),
      bottom: withTiming(targetBottom, {
        duration: FULL_SCREEN_LAYOUT_DURATION,
        easing: FULL_SCREEN_FRAME_EASING,
      }),
      // let the tray body own the joined top edge
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: targetRadius,
      borderBottomRightRadius: targetRadius,
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
    presentationFrameStyle,
    footerSpacerStyle,
    trayLayoutStyle,
    footerContainerStyle,
  };
};
