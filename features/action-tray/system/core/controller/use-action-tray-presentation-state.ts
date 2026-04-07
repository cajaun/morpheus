import { useCallback, useEffect, type ReactNode } from "react";
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SCREEN_HEIGHT,
  TRAY_KEYBOARD_GAP,
} from "../constants";

type Params = {
  visible: boolean;
  renderedFooter?: ReactNode;
  presentationFullScreen: boolean;
  keyboardHeight: SharedValue<number>;
};

export const useActionTrayPresentationState = ({
  visible,
  renderedFooter,
  presentationFullScreen,
  keyboardHeight,
}: Params) => {
  const { bottom } = useSafeAreaInsets();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const contentHeight = useSharedValue(0);
  const footerHeight = useSharedValue(0);
  const active = useSharedValue(false);
  const context = useSharedValue({ y: 0 });
  const hasFooter = useSharedValue(false);
  const closeGeneration = useSharedValue(0);
  const animationTravel = useSharedValue(SCREEN_HEIGHT);
  const surfaceOpacity = useSharedValue(1);

  useEffect(() => {
    hasFooter.value = !!renderedFooter;
  }, [hasFooter, renderedFooter]);

  const resolveRenderedContentHeight = useCallback(
    (measuredHeight: number) => {
      if (!presentationFullScreen) {
        return measuredHeight;
      }

      const keyboardInset =
        keyboardHeight.value > 0
          ? keyboardHeight.value + TRAY_KEYBOARD_GAP
          : 0;

      return Math.max(
        0,
        SCREEN_HEIGHT - footerHeight.value - keyboardInset,
      );
    },
    [footerHeight, keyboardHeight, presentationFullScreen],
  );

  const totalHeight = useDerivedValue(() => {
    if (presentationFullScreen) {
      return SCREEN_HEIGHT;
    }

    const keyboardInset =
      keyboardHeight.value > 0
        ? keyboardHeight.value + TRAY_KEYBOARD_GAP
        : 0;
    const trayBottomInset = Math.max(bottom, keyboardInset);

    return contentHeight.value + footerHeight.value + trayBottomInset;
  }, [bottom, keyboardHeight, presentationFullScreen]);

  const resolveClosedTranslateY = useCallback(
    (nextFooterHeight = footerHeight.value) => {
      if (presentationFullScreen) {
        return SCREEN_HEIGHT;
      }

      const keyboardInset =
        keyboardHeight.value > 0
          ? keyboardHeight.value + TRAY_KEYBOARD_GAP
          : 0;
      const trayBottomInset = Math.max(bottom, keyboardInset);

      return contentHeight.value + nextFooterHeight + trayBottomInset;
    },
    [bottom, contentHeight, footerHeight, keyboardHeight, presentationFullScreen],
  );

  const progress = useDerivedValue(() => {
    if (animationTravel.value <= 0) {
      return 0;
    }

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
      totalHeight,
      progress,
    },
    helpers: {
      resolveRenderedContentHeight,
      resolveClosedTranslateY,
    },
  };
};
