import {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  HORIZONTAL_MARGIN,
  MORPH_DURATION,
  SCREEN_HEIGHT,
  TRAY_KEYBOARD_GAP,
} from "../constants";

type Params = {
  translateY: { value: number };
  contentHeight: { value: number };
  hasFooter: { value: boolean };
  surfaceOpacity: { value: number };
  footerHeight: { value: number };
  keyboardHeight: { value: number };
  fullScreen: boolean;
  visible: boolean;
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
}: Params) => {
  const { bottom } = useSafeAreaInsets();

  // body content reserves footer height so detached footers never cover content
  const footerSpacerStyle = useAnimatedStyle(() => ({
    height: hasFooter.value ? footerHeight.value : 0,
  }));

  const trayLayoutStyle = useAnimatedStyle(() => {
    // sheets move with the keyboard but fullscreen shells stay pinned to the viewport
    const keyboardBottom =
      keyboardHeight.value > 0
        ? fullScreen
          ? keyboardHeight.value
          : keyboardHeight.value + TRAY_KEYBOARD_GAP
        : 0;
    const resolvedSheetHeight =
      contentHeight.value > 0
        ? Math.max(
            0,
            contentHeight.value + (hasFooter.value ? footerHeight.value : 0),
          )
        : undefined;

    return {
      left: fullScreen ? 0 : HORIZONTAL_MARGIN,
      right: fullScreen ? 0 : HORIZONTAL_MARGIN,
      bottom: fullScreen ? 0 : Math.max(bottom, keyboardBottom),
      height: fullScreen
        ? SCREEN_HEIGHT
        : resolvedSheetHeight,
      borderRadius: BORDER_RADIUS,
    };
  }, [bottom, contentHeight, fullScreen]);

  const footerContainerStyle = useAnimatedStyle(() => {
    // footer mirrors tray bounds but stays detached so actions can remain pinned
    const keyboardBottom =
      keyboardHeight.value > 0
        ? fullScreen
          ? keyboardHeight.value
          : keyboardHeight.value + TRAY_KEYBOARD_GAP
        : 0;

    return {
      left: fullScreen ? 0 : HORIZONTAL_MARGIN,
      right: fullScreen ? 0 : HORIZONTAL_MARGIN,
      // fullscreen footers should clear the keyboard without moving the shell
      bottom: fullScreen ? keyboardBottom : Math.max(bottom, keyboardBottom),
      borderTopLeftRadius: BORDER_RADIUS,
      borderTopRightRadius: BORDER_RADIUS,
      borderBottomLeftRadius: BORDER_RADIUS,
      borderBottomRightRadius: BORDER_RADIUS,
    };
  }, [bottom, fullScreen]);

  // every visible surface reads the same drag translation to avoid shearing
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const surfaceVisibilityStyle = useAnimatedStyle(() => ({
    opacity: surfaceOpacity.value,
  }));

  const footerVisibilityStyle = useAnimatedStyle(() => ({
    opacity: hasFooter.value ? surfaceOpacity.value : 0,
  }));

  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingHorizontal: 0,
    paddingBottom: 0,
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
    footerVisibilityStyle,
    fullScreenSurfaceFillStyle,
  };
};
