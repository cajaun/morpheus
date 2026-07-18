import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

// render one mounted page layer during idle or transition windows
export const TrayPagesScene: React.FC<{
  children: React.ReactNode;
  index: number;
  pageIndex: number;
  pageWidth: number;
  progress: SharedValue<number>;
}> = ({ children, index, pageIndex, pageWidth, progress }) => {
  const offscreenOffset = pageWidth + 4;
  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [index - 1, index, index + 1],
            [offscreenOffset, 0, -offscreenOffset],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }),
    [index, offscreenOffset, progress],
  );

  return (
    <Animated.View
      collapsable={false}
      pointerEvents={pageIndex === index ? "auto" : "none"}
      style={[styles.pageLayer, { width: pageWidth }, animatedStyle]}
    >
      <View style={styles.pageSlot}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pageSlot: {
    flex: 1,
    width: "100%",
  },
  pageLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
});
