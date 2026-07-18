import React from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayDemoTheme } from "../../theme";
import { TopGradient } from "../effects/top-gradient";
import {
  FULL_DRAG_DISTANCE,
  TRIGGER_DRAG_DISTANCE,
  useSearchAnimation,
} from "../animation/search-animation-provider";

export const DemoOverview = () => {
  const insets = useSafeAreaInsets();
  const theme = useTrayDemoTheme();
  const {
    blurIntensity,
    isListDragging,
    offsetY,
    onOpenResults,
    screenView,
  } = useSearchAnimation();

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      isListDragging.value = true;
    },
    onScroll: (event) => {
      const offsetYValue = event.contentOffset.y;
      offsetY.value = offsetYValue;

      if (screenView.value === "overview") {
        blurIntensity.value = interpolate(
          offsetYValue,
          [0, FULL_DRAG_DISTANCE],
          [0, 100],
          Extrapolation.CLAMP,
        );
      }
    },
    onEndDrag: (event) => {
      isListDragging.value = false;
      if (event.contentOffset.y < TRIGGER_DRAG_DISTANCE) {
        scheduleOnRN(onOpenResults);
      }
    },
  });

  const containerStyle = useAnimatedStyle(() => ({
    pointerEvents: screenView.value === "results" ? "none" : "auto",
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 40,
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-sf-bold"
          style={[styles.title, { color: theme.foreground }]}
        >
          Tray Demos
        </Text>
      </Animated.ScrollView>
      <TopGradient />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    letterSpacing: 0,
    textAlign: "center",
  },
});
