import React from "react";
import {
  Pressable,
  PressableProps,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { TraySeparator } from "./separator";
import {
  TRAY_HEADER_CLOSE_BUTTON_SIZE,
  TRAY_HEADER_CONTENT_HEIGHT,
  TRAY_HEADER_PADDING_BOTTOM,
  TRAY_HEADER_PADDING_TOP,
} from "../core/constants";

// header spacing is centralized so step chrome lines up across demos
export const TrayHeader: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  withSeparator?: boolean;
}> = ({ children, style, className, withSeparator = false }) => {
  return (
    <View
      className={className}
      style={[
    styles.header,
    withSeparator && styles.headerWithSeparator,
    style,
  ]}
    >
      {children}
      {withSeparator ? <TraySeparator /> : null}
    </View>
  );
};

// standardized header content row for tray examples and app-owned headers
export const TrayHeaderRow: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, style, className }) => (
  <View
    className={className}
    style={[styles.headerRow, style]}
  >
    {children}
  </View>
);

// standardized close control so every tray header shares the same hit target
export const TrayHeaderCloseButton: React.FC<
  Omit<PressableProps, "children" | "style"> & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    className?: string;
  }
> = ({ children, style, className, ...props }) => (
  <Pressable
    {...props}
    className={className}
    style={[styles.closeButton, style]}
  >
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  headerRow: {
    height: TRAY_HEADER_CONTENT_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    height: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    borderRadius: TRAY_HEADER_CLOSE_BUTTON_SIZE / 2,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingTop: TRAY_HEADER_PADDING_TOP,
  },
  headerWithSeparator: {
    gap: TRAY_HEADER_PADDING_BOTTOM,
  },

});

TrayHeader.displayName = "TrayHeader";
