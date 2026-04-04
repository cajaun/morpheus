import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TRAY_HORIZONTAL_PADDING,
  TRAY_VERTICAL_PADDING,
} from "../core/constants";

export const TrayBody: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  fullScreen?: boolean;
}> = ({ children, style, className, fullScreen = false }) => {
  const { top } = useSafeAreaInsets();

  return (
    <View
      className={className}
      style={[
        styles.body,
        fullScreen
          ? {
              paddingTop: top + TRAY_VERTICAL_PADDING,
            }
          : null,
        style,
      ]}
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
