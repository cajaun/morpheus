import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

export const TrayFooter: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, style, className }) => {
  return (
    <View className={className} style={style}>
      {children}
    </View>
  );
};

TrayFooter.displayName = "TrayFooter";
