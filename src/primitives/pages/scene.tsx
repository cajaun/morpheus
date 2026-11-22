import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

// one mounted page layer during idle or transition windows
export const TrayPagesScene: React.FC<{
  children: React.ReactNode;
  index: number;
  pageIndex: number;
  viewportWidth: SharedValue<number>;
  progress: SharedValue<number>;
}> = ({ children, index, pageIndex, viewportWidth, progress }) => {
  const animatedStyle = useAnimatedStyle(
    () => {
      const offscreenOffset = viewportWidth.value / 3;
      // each page fades on the clock that moves it
      const pageProgress = interpolate(
        progress.value,
        [index - 1, index, index + 1],
        [0, 1, 0],
        Extrapolation.CLAMP,
      );

      return {
        opacity: pageProgress,
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
      };
    },
    [index, progress, viewportWidth],
  );

  return (
    <Animated.View
      collapsable={false}
      pointerEvents={pageIndex === index ? "auto" : "none"}
      style={[styles.pageLayer, animatedStyle]}
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
  // fills the viewport natively, so a resizing viewport needs no React render
  pageLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
});
