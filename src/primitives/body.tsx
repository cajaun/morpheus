import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import {
  TRAY_FULL_SCREEN_BODY_HORIZONTAL_PADDING,
  TRAY_SHEET_BODY_HORIZONTAL_PADDING,
} from "../core/constants";
import { useTrayStepOptions } from "../runtime/tray-context";

// body owns horizontal padding so steps share one visual grid
export const TrayBody: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  fullScreen?: boolean;
}> = ({ children, style, className, fullScreen }) => {
  const stepOptions = useTrayStepOptions();
  const usesFullScreenPadding = fullScreen ?? stepOptions.fullScreen;

  return (
    <View
      className={className}
      style={[
        usesFullScreenPadding ? styles.fullScreenBody : styles.sheetBody,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  sheetBody: {
    paddingHorizontal: TRAY_SHEET_BODY_HORIZONTAL_PADDING,
  },
  fullScreenBody: {
    paddingHorizontal: TRAY_FULL_SCREEN_BODY_HORIZONTAL_PADDING,
  },
});

TrayBody.displayName = "TrayBody";
