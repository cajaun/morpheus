import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { TRAY_HORIZONTAL_PADDING } from "../core/constants";

// body owns horizontal padding so steps share one visual grid
export const TrayBody: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  fullScreen?: boolean;
}> = ({ children, style, className }) => {
  return (
    <View
      className={className}
      style={[styles.body, style]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: TRAY_HORIZONTAL_PADDING,
  },
});

TrayBody.displayName = "TrayBody";
