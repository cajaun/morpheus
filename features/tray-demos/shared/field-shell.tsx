import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { trayDemoFieldShellStyle } from "@/shared/theme/tokens";

export const FieldShell: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  return <View style={[trayDemoFieldShellStyle, style]}>{children}</View>;
};
