import {
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TrayTransitionOptions } from "../../runtime/tray-context";
import {
  BORDER_RADIUS,
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS,
  HORIZONTAL_MARGIN,
  MORPH_DURATION,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_VERTICAL_PADDING,
} from "../constants";

const EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT / 2;

type Params = {
  translateY: { value: number };
  contentHeight: { value: number };
  hasFooter: { value: boolean };
  surfaceOpacity: { value: number };
  footerHeight: { value: number };
  keyboardHeight: { value: number };
  fullScreen: boolean;
  visible: boolean;
  originProgress: { value: number };
  transition?: TrayTransitionOptions;
};

// split styles by concern so body footer and fill can move together without sharing layout logic
export const useActionTrayAnimatedStyles = ({
  translateY,
  contentHeight,
  hasFooter,
  surfaceOpacity,
  footerHeight,
  keyboardHeight,
  fullScreen,
  visible,
  originProgress,
  transition,
}: Params) => {
  const { bottom, top } = useSafeAreaInsets();
  const shouldUseOriginTransition =
    transition?.open === "expandFromTrigger" && !fullScreen;

  // body content reserves footer height so detached footers never cover content
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
    const targetBottom = fullScreen ? 0 : bottom;
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
        (bottom + EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET) -
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
      height: fullScreen
        ? SCREEN_HEIGHT
        : resolvedSheetHeight,
      borderRadius: BORDER_RADIUS,
    };
  }, [
    bottom,
    contentHeight,
    fullScreen,
    originProgress,
    shouldUseOriginTransition,
  ]);

  const footerContainerStyle = useAnimatedStyle(() => {
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom =
      keyboardHeight.value > 0
        ? keyboardHeight.value
        : bottom;
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
        (bottom + EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET) -
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
      // animate footer frame so it morphs with the sheet instead of snapping.
      left: targetLeft,
      right: targetRight,
      // keep footer clear of keyboard and anchored above safe area in all modes.
      bottom: withTiming(targetBottom, { duration: MORPH_DURATION }),
      borderTopLeftRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
      borderTopRightRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
      borderBottomLeftRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
      borderBottomRightRadius: withTiming(targetRadius, { duration: MORPH_DURATION }),
    };
  }, [
    bottom,
    footerHeight,
    fullScreen,
    keyboardHeight,
    originProgress,
    shouldUseOriginTransition,
  ]);

  // every visible surface reads the same drag translation to avoid shearing
  const dragStyle = useAnimatedStyle(() => {
    if (shouldUseOriginTransition) {
      return {
        transform: [
          {
            translateY: translateY.value * originProgress.value,
          },
        ],
      };
    }

    return {
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  }, [originProgress, shouldUseOriginTransition]);

  const surfaceVisibilityStyle = useAnimatedStyle(() => ({
    opacity: surfaceOpacity.value,
  }));

  const originSurfaceVisibilityStyle = useAnimatedStyle(() => {
    if (!shouldUseOriginTransition) {
      return {};
    }

    return {
      opacity:
        originProgress.value > EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS
          ? surfaceOpacity.value
          : 0,
    };
  }, [originProgress, shouldUseOriginTransition]);

  const contentRevealStyle = useAnimatedStyle(() => {
    if (shouldUseOriginTransition) {
      return {
        opacity:
          originProgress.value > EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS
            ? surfaceOpacity.value
            : 0,
      };
    }

    return {
      opacity: surfaceOpacity.value,
    };
  }, [originProgress, shouldUseOriginTransition]);

  const footerVisibilityStyle = useAnimatedStyle(() => ({
    opacity: hasFooter.value ? surfaceOpacity.value : 0,
  }));

  const footerContentFrameStyle = useAnimatedStyle(() => {
    if (!shouldUseOriginTransition) {
      return {
        width: "100%",
      };
    }

    const collapsedWidth =
      SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;
    const expandedWidth =
      SCREEN_WIDTH - HORIZONTAL_MARGIN * 2 - TRAY_VERTICAL_PADDING * 2;

    return {
      alignSelf: "center",
      width: interpolate(originProgress.value, [0, 1], [
        collapsedWidth,
        expandedWidth,
      ]),
    };
  }, [originProgress, shouldUseOriginTransition]);

  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  }));

  // fullscreen fill should arrive with the morph or keyboard transitions expose the old sheet shell
  const fullScreenSurfaceFillStyle = useAnimatedStyle(
    () => ({
      opacity:
        fullScreen && visible
          ? withTiming(1, { duration: MORPH_DURATION })
          : withTiming(0, { duration: 0 }),
    }),
    [fullScreen, visible],
  );

  return {
    footerSpacerStyle,
    trayLayoutStyle,
    footerContainerStyle,
    dragStyle,
    contentPaddingStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle,
    contentRevealStyle,
    footerVisibilityStyle,
    footerContentFrameStyle,
    fullScreenSurfaceFillStyle,
  };
};
