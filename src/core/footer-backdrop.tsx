import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants";

// a footer's background color moves off its padded frame, the frame's top padding stays clear so content passing behind shows up to the footer's own top edge
export const splitFooterBackdrop = (
  style: StyleProp<ViewStyle>,
): { backdropColor: ViewStyle["backgroundColor"]; style: ViewStyle } => {
  const { backgroundColor, ...rest } = StyleSheet.flatten(style) ?? {};

  return { backdropColor: backgroundColor, style: rest };
};

// drawn first inside the footer's content frame, it starts at the footer's top edge and its clipping frame bounds the sides and bottom
export const TrayFooterBackdrop = ({
  color,
}: {
  color: ViewStyle["backgroundColor"];
}) =>
  color == null ? null : (
    <View
      pointerEvents="none"
      style={[styles.backdrop, { backgroundColor: color }]}
    />
  );

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: -SCREEN_WIDTH,
    right: -SCREEN_WIDTH,
    bottom: -SCREEN_HEIGHT,
  },
});
