import { useCallback, useEffect, type ReactNode } from "react";
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { HORIZONTAL_MARGIN, SCREEN_HEIGHT } from "../constants";

type Params = {
  visible: boolean;
  renderedFooter?: ReactNode;
  presentationFullScreen: boolean;
};

// shared geometry values read by gesture, layout and lifecycle worklets
export const useTrayPresentationState = ({
  visible,
  renderedFooter,
  presentationFullScreen,
}: Params) => {
  // sheets sit 8pt above the screen edge so the home indicator stays over the surface
  const sheetBottomInset = HORIZONTAL_MARGIN;

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const contentHeight = useSharedValue(0);
  const footerHeight = useSharedValue(0);
  const active = useSharedValue(false);
  const context = useSharedValue({ y: 0 });
  const hasFooter = useSharedValue(false);
  const closeGeneration = useSharedValue(0);
  const animationTravel = useSharedValue(SCREEN_HEIGHT);
  const surfaceOpacity = useSharedValue(1);
  const originProgress = useSharedValue(1);
  const originTargetContentHeight = useSharedValue(0);

  useEffect(() => {
    // worklets read footer presence so the spacer height updates off the JS thread
    hasFooter.value = !!renderedFooter;
  }, [hasFooter, renderedFooter]);

  const resolveRenderedContentHeight = useCallback(
    (measuredHeight: number) => {
      if (!presentationFullScreen) {
        return measuredHeight;
      }

      // fullscreen owns the viewport, the native sticky host handles keyboard-aware sheet motion
      return Math.max(0, SCREEN_HEIGHT - footerHeight.value);
    },
    [footerHeight, presentationFullScreen],
  );

  const totalHeight = useDerivedValue(() => {
    if (presentationFullScreen) {
      // fullscreen dismissal and drag thresholds use the viewport height
      return SCREEN_HEIGHT;
    }

    return contentHeight.value + footerHeight.value + sheetBottomInset;
  }, [presentationFullScreen, sheetBottomInset]);

  const resolveClosedTranslateY = useCallback(
    (
      nextFooterHeight = footerHeight.value,
      nextContentHeight = contentHeight.value,
    ) => {
      if (presentationFullScreen) {
        // fullscreen closes by leaving the whole viewport
        return SCREEN_HEIGHT;
      }

      return nextContentHeight + nextFooterHeight + sheetBottomInset;
    },
    [contentHeight, footerHeight, presentationFullScreen, sheetBottomInset],
  );

  const progress = useDerivedValue(() => {
    if (animationTravel.value <= 0) {
      return 0;
    }

    // progress stays normalized when a drag passes the closed position
    const travel = Math.min(
      Math.max(translateY.value, 0),
      animationTravel.value,
    );

    return 1 - travel / animationTravel.value;
  });

  useAnimatedReaction(
    () => {
      if (!visible) {
        return -1;
      }

      if (Math.abs(translateY.value) > 0.5) {
        return -1;
      }

      // an open tray's content height sets the close travel baseline
      return totalHeight.value;
    },
    (nextTravel, previousTravel) => {
      if (nextTravel > 0 && nextTravel !== previousTravel) {
        animationTravel.value = nextTravel;
      }
    },
    [visible],
  );

  return {
    shared: {
      translateY,
      contentHeight,
      footerHeight,
      active,
      context,
      hasFooter,
      closeGeneration,
      animationTravel,
      surfaceOpacity,
      originProgress,
      originTargetContentHeight,
      totalHeight,
      progress,
    },
    helpers: {
      resolveRenderedContentHeight,
      resolveClosedTranslateY,
    },
  };
};
