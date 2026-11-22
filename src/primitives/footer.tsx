import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

export type TrayFooterProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  // inside Tray.Step, consecutive steps sharing an id keep one footer on screen, without an id the footer enters and leaves with its step
  id?: string;
};

// a semantic wrapper, the shell renders footers on their own layer
export const TrayFooter: React.FC<TrayFooterProps> = ({
  children,
  style,
  className,
}) => {
  return (
    <View className={className} style={[{ width: "100%", alignItems: "center" }, style]}>
      {children}
    </View>
  );
};

TrayFooter.displayName = "TrayFooter";
