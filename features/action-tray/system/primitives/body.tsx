import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TRAY_HORIZONTAL_PADDING,
  TRAY_VERTICAL_PADDING,
} from "../core/constants";
import { useTrayStepOptions } from "../runtime/tray-context";

export const TrayBody: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  fullScreen?: boolean;
}> = ({ children, style, className, fullScreen }) => {
  const { top } = useSafeAreaInsets();
  const presentation = useTrayStepOptions();
  const resolvedFullScreen = fullScreen ?? presentation.fullScreen;

  return (
    <View
      className={className}
      style={[
        styles.body,
        resolvedFullScreen
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
