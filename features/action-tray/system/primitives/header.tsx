import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { TraySeparator } from "./separator";
import { TRAY_SECTION_GAP } from "../core/constants";

// header spacing is centralized so step chrome lines up across demos
export const TrayHeader: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  withSeparator?: boolean;
}> = ({ children, style, className, withSeparator = false }) => {
  return (
    <View className={className} style={[styles.header, style]}>
      {children}
      {withSeparator ? <TraySeparator /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: TRAY_SECTION_GAP,
    gap: TRAY_SECTION_GAP,
  },
});

TrayHeader.displayName = "TrayHeader";
