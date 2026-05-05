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
} from "../constants";

type Params = {
  translateY: { value: number };
  contentHeight: { value: number };
  hasFooter: { value: boolean };
  surfaceOpacity: { value: number };
  footerHeight: { value: number };
  keyboardHeight: { value: number };
  fullScreen: boolean;
  fullScreenSafeAreaTop: boolean;
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
  fullScreenSafeAreaTop,
  visible,
}: Params) => {
  const { top, bottom } = useSafeAreaInsets();

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

    return {
      left: fullScreen ? 0 : HORIZONTAL_MARGIN,
      right: fullScreen ? 0 : HORIZONTAL_MARGIN,
      bottom: fullScreen ? 0 : bottom,
      height: fullScreen
        ? SCREEN_HEIGHT
        : resolvedSheetHeight,
      borderRadius: BORDER_RADIUS,
    };
  }, [bottom, contentHeight, fullScreen]);

  const footerContainerStyle = useAnimatedStyle(() => {
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom =
      keyboardHeight.value > 0
        ? keyboardHeight.value
        : bottom;
    const targetRadius = fullScreen ? 0 : BORDER_RADIUS;

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
  }, [bottom, fullScreen, keyboardHeight]);

  // every visible surface reads the same drag translation to avoid shearing
  const dragStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  });

  const surfaceVisibilityStyle = useAnimatedStyle(() => ({
    opacity: surfaceOpacity.value,
  }));

  const footerVisibilityStyle = useAnimatedStyle(() => ({
    opacity: hasFooter.value ? surfaceOpacity.value : 0,
  }));

  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: fullScreen && fullScreenSafeAreaTop ? top : 0,
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
