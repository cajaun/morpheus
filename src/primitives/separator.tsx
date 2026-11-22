import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

// separators carry fixed styling as part of the tray chrome
export const TraySeparator: React.FC<{
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ style, className }) => {
  return <View className={className} style={[styles.separator, style]} />;
};

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: "#F6F6F6",
  },
});

TraySeparator.displayName = "TraySeparator";
