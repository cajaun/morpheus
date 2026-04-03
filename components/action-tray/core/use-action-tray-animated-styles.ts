import { useAnimatedStyle } from "react-native-reanimated";
import { HORIZONTAL_MARGIN } from "./constants";

type Params = {
  animMargin: { value: number };
  animRadius: { value: number };
  animBottom: { value: number };
  animMinHeight: { value: number };
  animFullScreenBg: { value: number };
  translateY: { value: number };
  hasFooter: { value: boolean };
  footerHeight: { value: number };
};

export const useActionTrayAnimatedStyles = ({
  animMargin,
  animRadius,
  animBottom,
  animMinHeight,
  animFullScreenBg,
  translateY,
  hasFooter,
  footerHeight,
}: Params) => {
  const fullScreenBgStyle = useAnimatedStyle(() => ({
    opacity: animFullScreenBg.value,
  }));

  const footerSpacerStyle = useAnimatedStyle(() => ({
    height: hasFooter.value ? footerHeight.value : 0,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    left: animMargin.value,
    right: animMargin.value,
    borderRadius: animRadius.value,
    bottom: animBottom.value,
    minHeight: animMinHeight.value,
  }));

  const footerContainerStyle = useAnimatedStyle(() => ({
    left: animMargin.value,
    right: animMargin.value,
    bottom: animBottom.value,
    borderTopLeftRadius: animRadius.value,
    borderTopRightRadius: animRadius.value,
    borderBottomLeftRadius: animRadius.value,
    borderBottomRightRadius: animRadius.value,
  }));

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const contentPaddingStyle = useAnimatedStyle(() => ({
  paddingHorizontal: HORIZONTAL_MARGIN - animMargin.value,
}));

  return {
    fullScreenBgStyle,
    footerSpacerStyle,
    containerStyle,
    footerContainerStyle,
    dragStyle,
      contentPaddingStyle,
  };
};