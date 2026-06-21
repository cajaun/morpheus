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
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  HORIZONTAL_MARGIN,
  MORPH_ENTERING_DURATION,
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
const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING = 6;
const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT +
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING +
  TRAY_VERTICAL_PADDING;

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
  const collapsedBottomInset =
    transition?.origin === "fullScreenFooter"
      ? TRAY_VERTICAL_PADDING
      : EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET;
  const targetBottomInset =
    transition?.origin === "fullScreenFooter" ? collapsedBottomInset : 0;
  // Presentation mode changes need concrete layout props in the same native
  // commit as the keyed content swap. Worklet-driven styles still own the
  // continuous interpolation inside each mode.
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
    const targetRadius = fullScreen ? 0 : BORDER_RADIUS;
    const targetTop = fullScreen
      ? 0
      : resolvedSheetHeight === undefined
        ? undefined
        : SCREEN_HEIGHT - targetBottom - resolvedSheetHeight;

    if (shouldUseOriginTransition && targetTop !== undefined) {
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
      // Regular sheets derive geometry from their children so layout and enter
      // animations share a native commit. Returning from fullscreen is the one
      // exception: the retained exiting subtree can still claim 100% height, so
      // the previously measured sheet target owns the frame until that layout
      // transition completes.
      height: fullScreen
        ? SCREEN_HEIGHT
        : useMeasuredSheetHeight
          ? resolvedSheetHeight
          : undefined,
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
    useMeasuredSheetHeight,
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
          TRAY_VERTICAL_PADDING,
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
      left: targetLeft,
      right: targetRight,
      bottom: withTiming(targetBottom, {
        duration: MORPH_ENTERING_DURATION,
      }),
      borderTopLeftRadius: withTiming(targetRadius, {
        duration: MORPH_ENTERING_DURATION,
      }),
      borderTopRightRadius: withTiming(targetRadius, {
        duration: MORPH_ENTERING_DURATION,
      }),
      borderBottomLeftRadius: withTiming(targetRadius, {
        duration: MORPH_ENTERING_DURATION,
      }),
      borderBottomRightRadius: withTiming(targetRadius, {
        duration: MORPH_ENTERING_DURATION,
      }),
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
