import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

export type TrayFooterProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  // Inside a Tray.Step, consecutive steps whose footers share an id keep one
  // footer on screen (only its contents update). Without an id the footer
  // belongs to its step and enters and leaves with that step's content.
  id?: string;
};

// footer is a semantic wrapper because the shell renders it on a separate layer
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
