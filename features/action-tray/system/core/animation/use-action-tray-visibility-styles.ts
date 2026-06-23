import {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS,
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
  "hasFooter" | "surfaceOpacity" | "transition"
> &
  Pick<
    ActionTrayAnimationState,
    "originProgress" | "shouldUseOriginTransition"
  >;

export const useActionTrayVisibilityStyles = ({
  hasFooter,
  originProgress,
  shouldUseOriginTransition,
  surfaceOpacity,
  transition,
}: Params) => {
  const surfaceVisibilityStyle = useAnimatedStyle(() => ({
    opacity: surfaceOpacity.value,
  }));

  const originSurfaceVisibilityStyle = useAnimatedStyle(() => {
    if (!shouldUseOriginTransition) {
      return {};
    }

    return {
      // hide the sheet contents while the trigger is still visually a pill
      opacity:
        originProgress.value > EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS
          ? surfaceOpacity.value
          : 0,
    };
  }, [originProgress, shouldUseOriginTransition]);

  const contentRevealStyle = useAnimatedStyle(() => {
    if (shouldUseOriginTransition) {
      return {
        // content reveal matches surface reveal so children do not appear inside the collapsed pill
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
    // footer layer stays mounted but invisible when the step has no footer
    opacity: hasFooter.value ? surfaceOpacity.value : 0,
  }));

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

  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  }));

  return {
    contentPaddingStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle,
    contentRevealStyle,
    footerVisibilityStyle,
    footerContentFrameStyle,
  };
};
