import React from "react";
import { Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTrayDemoTheme } from "../../theme";
import {
  CANCEL_CONTAINER_WIDTH,
  SEARCHBAR_HEIGHT,
  SETTINGS_CONTAINER_WIDTH,
  useSearchAnimation,
} from "../animation/search-animation-provider";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CancelButton = () => {
  const theme = useTrayDemoTheme();
  const { onCloseResults, screenView } = useSearchAnimation();

  const containerStyle = useAnimatedStyle(() => ({
    opacity: screenView.value === "results" ? withTiming(1) : 0,
    pointerEvents: screenView.value === "results" ? "auto" : "none",
    width: withTiming(
      screenView.value === "results"
        ? CANCEL_CONTAINER_WIDTH
        : SETTINGS_CONTAINER_WIDTH,
    ),
  }));

  return (
    <AnimatedPressable
      onPress={onCloseResults}
      style={[
        {
          alignItems: "center",
          height: SEARCHBAR_HEIGHT,
          justifyContent: "center",
          zIndex: 999,
        },
        containerStyle,
      ]}
    >
      <Text
        className="font-sf-medium "
        style={{ color: theme.icon, fontSize: 17 }}
      >
        Cancel
      </Text>
    </AnimatedPressable>
  );
};
