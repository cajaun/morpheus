import { SymbolView } from "expo-symbols";
import React from "react";
import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useTrayDemoTheme } from "../../theme";
import {
  TRIGGER_DRAG_DISTANCE,
  useSearchAnimation,
} from "../animation/search-animation-provider";
import { useSearchHeaderHeight } from "../header/use-search-header-height";

export const AnimatedChevron = () => {
  const theme = useTrayDemoTheme();
  const { grossHeight } = useSearchHeaderHeight();
  const { offsetY } = useSearchAnimation();

  const containerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      offsetY.value,
      [0, TRIGGER_DRAG_DISTANCE],
      [0, Math.abs(TRIGGER_DRAG_DISTANCE)],
    ),
    opacity: interpolate(
      offsetY.value,
      [0, TRIGGER_DRAG_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: grossHeight,
        },
        containerStyle,
      ]}
    >
      <View style={{ transform: [{ scaleX: 1.5 }] }}>
        <SymbolView
          name="chevron.down"
          tintColor={theme.muted}
          size={20}
          weight="semibold"
        />
      </View>
    </Animated.View>
  );
};
