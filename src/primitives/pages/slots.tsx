import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

// separate page chrome slots from page content children
export const TrayPagesHeaderSlot: React.FC<{
  children: React.ReactNode;
  shell?: boolean;
}> = ({ children }) => {
  return <>{children}</>;
};

TrayPagesHeaderSlot.displayName = "TrayPagesHeader";

// render footer content with its authored visual styling
export const TrayPagesFooterSlot: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, style, className }) => {
  const flattenedStyle = StyleSheet.flatten(style);
  const hasBackgroundColor = flattenedStyle?.backgroundColor != null;

  return (
    <Animated.View
      className={className}
      style={[
        !hasBackgroundColor && styles.footerTransparentBackground,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

TrayPagesFooterSlot.displayName = "TrayPagesFooter";

// identify typed page slots while parsing arbitrary children
export const isElementOfType = <T,>(
  child: React.ReactNode,
  component: React.ComponentType<T>,
): child is React.ReactElement<T> =>
  React.isValidElement(child) && child.type === component;

const styles = StyleSheet.create({
  footerTransparentBackground: {
    backgroundColor: "transparent",
  },
});
