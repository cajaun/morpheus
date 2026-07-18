import React from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { UsageVariant } from "../../component-presentation/types";
import { useTrayDemoTheme } from "../../theme";
import { TopGradient } from "../effects/top-gradient";
import { useSearchHeaderHeight } from "../header/use-search-header-height";
import {
  FULL_DRAG_DISTANCE,
  useSearchAnimation,
} from "../animation/search-animation-provider";

type DemoResultsListProps = {
  data: UsageVariant[];
  query: string;
};

export const DemoResultsList = ({ data, query }: DemoResultsListProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTrayDemoTheme();
  const { grossHeight, netHeight } = useSearchHeaderHeight();
  const { blurIntensity, offsetY, screenView } = useSearchAnimation();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredData = normalizedQuery
    ? data.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
    : data;

  const containerStyle = useAnimatedStyle(() => {
    const overlayOpacity = interpolate(
      blurIntensity.value,
      [0, 70],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const pullOpacity = interpolate(
      offsetY.value,
      [FULL_DRAG_DISTANCE * 0.2, FULL_DRAG_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: Math.max(overlayOpacity, pullOpacity),
      pointerEvents: screenView.value === "results" ? "auto" : "none",
      transform: [{ translateY: -offsetY.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            gap: 6,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 16,
            paddingTop: grossHeight + 20,
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/demos",
                  params: { demo: item.value },
                });
              }}
              style={styles.resultRow}
            >
              <Text
                className="font-sf-semibold"
                numberOfLines={1}
                style={[styles.resultText, { color: theme.foreground }]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
          scrollIndicatorInsets={{ top: netHeight + 16 }}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
      <TopGradient />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  resultRow: {
    alignItems: "center",
    alignSelf: "stretch",
    borderCurve: "continuous",
    borderRadius: 18,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  resultText: {
    fontSize: 18,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
