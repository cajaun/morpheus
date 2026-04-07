import {
  useAnimatedStyle,
  withDelay,
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

  const footerSpacerStyle = useAnimatedStyle(() => ({
    height: hasFooter.value ? footerHeight.value : 0,
  }));

  const trayLayoutStyle = useAnimatedStyle(() => {
    const keyboardBottom =
      keyboardHeight.value > 0 ? keyboardHeight.value + TRAY_KEYBOARD_GAP : 0;
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
      bottom: fullScreen ? keyboardBottom : Math.max(bottom, keyboardBottom),
      height: fullScreen
        ? Math.max(0, SCREEN_HEIGHT - keyboardBottom)
        : resolvedSheetHeight,
      borderRadius: BORDER_RADIUS,
    };
  }, [bottom, contentHeight, fullScreen]);

  const footerContainerStyle = useAnimatedStyle(() => {
    const keyboardBottom =
      keyboardHeight.value > 0 ? keyboardHeight.value + TRAY_KEYBOARD_GAP : 0;

    return {
      left: fullScreen ? 0 : HORIZONTAL_MARGIN,
      right: fullScreen ? 0 : HORIZONTAL_MARGIN,
      bottom: fullScreen ? keyboardBottom : Math.max(bottom, keyboardBottom),
      borderTopLeftRadius: BORDER_RADIUS,
      borderTopRightRadius: BORDER_RADIUS,
      borderBottomLeftRadius: BORDER_RADIUS,
      borderBottomRightRadius: BORDER_RADIUS,
    };
  }, [bottom, fullScreen]);

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

  const fullScreenSurfaceFillStyle = useAnimatedStyle(
    () => ({
      opacity:
        fullScreen && visible
          ? withDelay(MORPH_DURATION, withTiming(1, { duration: 0 }))
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
