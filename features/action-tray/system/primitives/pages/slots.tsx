import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useTrayHost, useTrayStepOptions } from "../../runtime/tray-context";

// separate page chrome slots from page content children
export const TrayPagesHeaderSlot: React.FC<{
  children: React.ReactNode;
  shell?: boolean;
}> = ({ children }) => {
  return <>{children}</>;
};

TrayPagesHeaderSlot.displayName = "TrayPagesHeader";

export const TrayPagesFooterSlot: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, style, className }) => {
  const { keyboardHeight } = useTrayHost();
  const { fullScreen } = useTrayStepOptions();
  const flattenedStyle = StyleSheet.flatten(style);
  const hasBackgroundColor = flattenedStyle?.backgroundColor != null;
  const keyboardAwareStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: fullScreen ? -keyboardHeight.value : 0 }],
    }),
    [fullScreen, keyboardHeight],
  );

  return (
    <Animated.View
      className={className}
      style={[
        !hasBackgroundColor && styles.footerTransparentBackground,
        style,
        keyboardAwareStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

TrayPagesFooterSlot.displayName = "TrayPagesFooter";

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
