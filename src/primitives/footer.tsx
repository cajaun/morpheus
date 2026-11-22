import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

// how a footer leaves when the next step shows another footer or none, inPlace fades it where it is, withContent leaves with its step's content the way an entering footer arrives
export type TrayFooterExit = "inPlace" | "withContent";

export type TrayFooterProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  // consecutive steps with a footer keep one on screen, a different id marks a different footer that enters and leaves with its step
  id?: string;
  // defaults to inPlace
  exit?: TrayFooterExit;
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
