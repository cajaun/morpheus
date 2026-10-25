import { interpolate, useAnimatedStyle } from "react-native-reanimated";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS,
  HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
  TRAY_SHEET_BODY_HORIZONTAL_PADDING,
} from "../constants";
import type {
  TrayAnimatedStyleParams,
  TrayAnimationState,
} from "./tray-animated-style-types";

type Params = Pick<
  TrayAnimatedStyleParams,
  "surfaceOpacity" | "transition"
> &
  Pick<
    TrayAnimationState,
    "originProgress" | "shouldUseOriginTransition"
  >;

const EMPTY_STYLE = {};
const ZERO_CONTENT_PADDING_STYLE = {
  paddingHorizontal: 0,
  paddingBottom: 0,
  paddingTop: 0,
};

// coordinate surface content and footer visibility with shell progress
export const useTrayVisibilityStyles = ({
  originProgress,
  shouldUseOriginTransition,
  surfaceOpacity,
  transition,
}: Params) => {
  const surfaceVisibilityStyle = useAnimatedStyle(
    () => ({
      // The trigger-origin gate takes precedence over ordinary visibility.
      opacity:
        shouldUseOriginTransition &&
        !(originProgress.value > EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS)
          ? 0
          : surfaceOpacity.value,
    }),
    [originProgress, shouldUseOriginTransition, surfaceOpacity],
  );

  const footerContentFrameStyle = useAnimatedStyle(() => {
    const sheetContentWidth =
      SCREEN_WIDTH -
      HORIZONTAL_MARGIN * 2 -
      TRAY_SHEET_BODY_HORIZONTAL_PADDING * 2;

    if (!shouldUseOriginTransition) {
      return {
        // keep visible footer content on the sheet grid in fullscreen
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
      // footer content narrows from trigger width to the inner sheet grid
      width: interpolate(originProgress.value, [0, 1], [
        collapsedWidth,
        sheetContentWidth,
      ]),
    };
  }, [originProgress, shouldUseOriginTransition, transition?.origin]);

  return {
    contentPaddingStyle: ZERO_CONTENT_PADDING_STYLE,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle: EMPTY_STYLE,
    contentRevealStyle: EMPTY_STYLE,
    footerVisibilityStyle: EMPTY_STYLE,
    footerContentFrameStyle,
  };
};
