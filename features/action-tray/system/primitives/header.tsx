import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { TraySeparator } from "./separator";
import {
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
        !withSeparator && styles.headerWithoutSeparator,
        style,
      ]}
    >
      {children}
      {withSeparator ? <TraySeparator /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: TRAY_HEADER_PADDING_TOP,
    gap: TRAY_HEADER_PADDING_BOTTOM,
  },
  headerWithoutSeparator: {
    paddingBottom: TRAY_HEADER_PADDING_BOTTOM,
  },
});

TrayHeader.displayName = "TrayHeader";
