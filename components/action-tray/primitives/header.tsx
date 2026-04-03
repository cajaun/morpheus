import React from "react";
import { View, StyleSheet } from "react-native";

export const TrayHeader: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <View style={styles.header}>{children}</View>;
};

const styles = StyleSheet.create({
  header: {
    
  },
});

TrayHeader.displayName = "TrayHeader";