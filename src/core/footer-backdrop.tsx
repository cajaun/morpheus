import React from "react";
import {
  processColor,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_FOOTER_PADDING_TOP,
} from "./constants";

type AnimatedStyle = React.ComponentProps<typeof Animated.View>["style"];

// a footer's backing is solid from the top edge of its controls down, its top padding holds a fade, so content passing behind dissolves into the backing instead of meeting a straight edge
export const resolveFooterBackingHeight = (
  frameHeight: number,
  paddingTop: number,
) => {
  "worklet";

  return Math.max(0, frameHeight - paddingTop);
};

// the fade overlaps the solid backing by a point so no seam shows where they meet
const FOOTER_FADE_OVERLAP = 1;

// a linear fade from the backing color at no opacity to the backing color, never through another color
export const resolveFooterFadeImage = (
  color: ViewStyle["backgroundColor"],
): string | undefined => {
  if (color == null) {
    return undefined;
  }

  const processed = processColor(color);

  if (typeof processed !== "number") {
    return undefined;
  }

  const alpha = ((processed >>> 24) & 255) / 255;
  const red = (processed >>> 16) & 255;
  const green = (processed >>> 8) & 255;
  const blue = processed & 255;
  const rgb = `${red}, ${green}, ${blue}`;

  return `linear-gradient(to bottom, rgba(${rgb}, 0), rgba(${rgb}, ${alpha}))`;
};

// a footer's background color moves off its padded frame onto its backing
export const splitFooterBackdrop = (
  style: StyleProp<ViewStyle>,
): { backdropColor: ViewStyle["backgroundColor"]; style: ViewStyle } => {
  const { backgroundColor, ...rest } = StyleSheet.flatten(style) ?? {};

  return { backdropColor: backgroundColor, style: rest };
};

// sits directly above a backing, inside the footer's top padding
export const TrayFooterFade = ({
  color,
  style,
}: {
  color: ViewStyle["backgroundColor"];
  style?: AnimatedStyle;
}) => {
  const image = resolveFooterFadeImage(color);

  return image === undefined ? null : (
    <Animated.View
      pointerEvents="none"
      style={[styles.fade, { experimental_backgroundImage: image }, style]}
    />
  );
};

// drawn first inside the footer's content frame, solid from the controls' top edge with the fade above, its clipping frame bounds the sides and bottom
export const TrayFooterBackdrop = ({
  color,
}: {
  color: ViewStyle["backgroundColor"];
}) =>
  color == null ? null : (
    <View
      pointerEvents="none"
      style={[styles.backdrop, { backgroundColor: color }]}
    >
      <TrayFooterFade color={color} />
    </View>
  );

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: -SCREEN_WIDTH,
    right: -SCREEN_WIDTH,
    bottom: -SCREEN_HEIGHT,
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "100%",
    height: TRAY_FOOTER_PADDING_TOP + FOOTER_FADE_OVERLAP,
    marginBottom: -FOOTER_FADE_OVERLAP,
  },
});
