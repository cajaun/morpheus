import React, { useContext } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import {
  TrayShellTransitionContext,
  TraySheetLayoutAnimationContext,
} from "./visual-view/contexts";
import { TrayFooterFade } from "./footer-backdrop";

type AnimatedStyle = React.ComponentProps<typeof Animated.View>["style"];

// a zero-height anchor on the sheet's bottom edge, drawn inside the sheet so the sheet's own rounded edge clips what hangs from it, its frame follows the sheet's layout animation so it holds that edge while the sheet resizes
export const TraySheetBottomAnchor = ({
  style,
  children,
}: {
  style?: AnimatedStyle;
  children?: React.ReactNode;
}) => {
  const transition = useContext(TrayShellTransitionContext);
  const animatesLayout = useContext(TraySheetLayoutAnimationContext);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.anchor, style]}
      layout={
        animatesLayout ? transition?.followerLayoutAnimationConfig : undefined
      }
    >
      {children}
    </Animated.View>
  );
};

// the fixed footer's backing, solid from its controls' top edge to its bottom with a fade above, so content passing behind the footer is covered without a second rounded edge over the sheet's
export const TrayFixedFooterBacking = ({
  color,
  frameStyle,
  fadeStyle,
}: {
  color: ViewStyle["backgroundColor"];
  frameStyle: AnimatedStyle;
  fadeStyle?: AnimatedStyle;
}) =>
  color == null ? null : (
    <TraySheetBottomAnchor>
      <Animated.View
        style={[styles.backing, { backgroundColor: color }, frameStyle]}
      >
        <TrayFooterFade color={color} style={fadeStyle} />
      </Animated.View>
    </TraySheetBottomAnchor>
  );

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 0,
    overflow: "visible",
  },
  backing: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
