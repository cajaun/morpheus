import React from "react";
import { Pressable, PressableProps } from "react-native";
import { useTray } from "../context/context";
import { useTrayScope } from "../context/root";

type TrayTriggerProps = PressableProps & {
  children: React.ReactNode;
};

export const TrayTrigger: React.FC<TrayTriggerProps> = ({
  children,
  onPress,
  ...rest
}) => {
  const trayId = useTrayScope();
  const { openTray } = useTray();

  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        onPress?.(e);
        if (trayId) openTray(trayId);
      }}
    >
      {children}
    </Pressable>
  );
};

TrayTrigger.displayName = "TrayTrigger";
