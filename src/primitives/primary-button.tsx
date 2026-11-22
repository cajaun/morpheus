import React from "react";
import { PressableProps, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { TRAY_PRIMARY_BUTTON_HEIGHT } from "../core/constants";
import { TrayPressableScale } from "./pressable-scale";

// shared action geometry keeps footer buttons consistent
export const TrayPrimaryButton: React.FC<
  Omit<PressableProps, "children" | "onPress" | "style"> & {
    children: React.ReactNode;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    className?: string;
  }
> = ({ children, style, className, ...props }) => (
  <TrayPressableScale
    {...props}
    className={className}
    style={[styles.button, style]}
  >
    {children}
  </TrayPressableScale>
);

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: TRAY_PRIMARY_BUTTON_HEIGHT,
    borderRadius: TRAY_PRIMARY_BUTTON_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

TrayPrimaryButton.displayName = "TrayPrimaryButton";
