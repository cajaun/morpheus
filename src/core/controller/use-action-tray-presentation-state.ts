import { useCallback, useEffect, type ReactNode } from "react";
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { HORIZONTAL_MARGIN, SCREEN_HEIGHT } from "../constants";

// presentation state owns the shared values read across gesture layout and lifecycle code
type Params = {
  visible: boolean;
  renderedFooter?: ReactNode;
  presentationFullScreen: boolean;
};

// own shared geometry values consumed by gesture and animation worklets
export const useActionTrayPresentationState = ({
  visible,
  renderedFooter,
  presentationFullScreen,
}: Params) => {
  // Sheets sit 8pt above the screen edge so the system home indicator can
  // remain over the surface, matching the reference tray.
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
    // footer presence is shared with worklets so spacer height can update off the js thread
    hasFooter.value = !!renderedFooter;
  }, [hasFooter, renderedFooter]);

  const resolveRenderedContentHeight = useCallback(
    (measuredHeight: number) => {
      if (!presentationFullScreen) {
        return measuredHeight;
      }

      // fullscreen owns the viewport; keyboard-aware sheet motion is handled
      // by the native sticky host, not by fullscreen geometry.
      return Math.max(0, SCREEN_HEIGHT - footerHeight.value);
    },
    [footerHeight, presentationFullScreen],
  );

  const totalHeight = useDerivedValue(() => {
    if (presentationFullScreen) {
      // fullscreen dismissal and drag thresholds use viewport height instead of content height
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

    // progress remains normalized even when the user drags past the closed position
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

      // once open content height changes should update the close travel baseline
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
