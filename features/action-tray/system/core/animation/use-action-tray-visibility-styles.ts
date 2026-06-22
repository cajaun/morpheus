import {
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS,
  FULL_SCREEN_LAYOUT_DURATION,
  HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
  TRAY_SHEET_BODY_HORIZONTAL_PADDING,
} from "../constants";
import type {
  ActionTrayAnimatedStyleParams,
  ActionTrayAnimationState,
} from "./action-tray-animated-style-types";

type Params = Pick<
  ActionTrayAnimatedStyleParams,
  "hasFooter" | "surfaceOpacity" | "transition" | "visible"
> &
  Pick<
    ActionTrayAnimationState,
    "fullScreen" | "originProgress" | "shouldUseOriginTransition"
  >;

export const useActionTrayVisibilityStyles = ({
  fullScreen,
  hasFooter,
  originProgress,
  shouldUseOriginTransition,
  surfaceOpacity,
  transition,
  visible,
}: Params) => {
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
    const sheetContentWidth =
      SCREEN_WIDTH -
      HORIZONTAL_MARGIN * 2 -
      TRAY_SHEET_BODY_HORIZONTAL_PADDING * 2;

    if (!shouldUseOriginTransition) {
      return {
        // The detached footer surface may become edge-to-edge in fullscreen,
        // but its visible content should retain the sheet's inner width.
        alignSelf: "center",
        width: sheetContentWidth,
      };
    }

    const collapsedWidth =
      transition?.origin === "fullScreenFooter"
        ? sheetContentWidth
        : SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;

    return {
      alignSelf: "center",
      width: interpolate(originProgress.value, [0, 1], [
        collapsedWidth,
        sheetContentWidth,
      ]),
    };
  }, [originProgress, shouldUseOriginTransition, transition?.origin]);

  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  }));

  const fullScreenSurfaceFillStyle = useAnimatedStyle(
    () => ({
      opacity:
        fullScreen && visible
          ? withTiming(1, { duration: FULL_SCREEN_LAYOUT_DURATION })
          : withTiming(0, { duration: 0 }),
    }),
    [fullScreen, visible],
  );

  return {
    contentPaddingStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle,
    contentRevealStyle,
    footerVisibilityStyle,
    footerContentFrameStyle,
    fullScreenSurfaceFillStyle,
  };
};
