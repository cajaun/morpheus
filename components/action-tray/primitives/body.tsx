import React from "react";
import { View, StyleSheet } from "react-native";
import { TRAY_HORIZONTAL_PADDING } from "../core/constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TrayBody: React.FC<{
  children: React.ReactNode;
  fullScreen?: boolean;
}> = ({ children, fullScreen }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.body,
        fullScreen && {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: TRAY_HORIZONTAL_PADDING,
    // paddingVertical: 16,
  },
});

TrayBody.displayName = "TrayBody";
