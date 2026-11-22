import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

// the parent primitive orchestrates pages, so a page stays thin
export const TrayPage: React.FC<{
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

TrayPage.displayName = "TrayPage";
