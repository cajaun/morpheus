import React from "react";
import { Pressable, PressableProps } from "react-native";
import { useTrayFlow } from "../runtime/tray-context";

type TrayTriggerProps = PressableProps & {
  children: React.ReactNode;
};

export const TrayTrigger: React.FC<TrayTriggerProps> = ({
  children,
  onPress,
  ...rest
}) => {
  const { open } = useTrayFlow();

  return (
    <Pressable
      {...rest}
      onPress={(event) => {
        onPress?.(event);
        open();
      }}
    >
      {children}
    </Pressable>
  );
};

TrayTrigger.displayName = "TrayTrigger";
