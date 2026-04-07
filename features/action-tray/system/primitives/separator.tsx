import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

export const TraySeparator: React.FC<{
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ style, className }) => {
  return <View className={className} style={[styles.separator, style]} />;
};

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: "#F2F2F2",
  },
});

TraySeparator.displayName = "TraySeparator";
