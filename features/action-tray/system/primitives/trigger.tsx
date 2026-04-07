import React from "react";
import { Pressable, PressableProps } from "react-native";
import {
  useTrayHostActions,
  useTrayScope,
} from "../runtime/tray-context";
import { markTrayTriggerPressed } from "../telemetry/tray-open-timing";

type TrayTriggerProps = PressableProps & {
  children: React.ReactNode;
};

export const TrayTrigger: React.FC<TrayTriggerProps> = ({
  children,
  onPress,
  ...rest
}) => {
  const trayId = useTrayScope();
  const { openTray } = useTrayHostActions();

  if (!trayId) {
    throw new Error("Tray.Trigger must be used within Tray.Root");
  }

  return (
    <Pressable
      {...rest}
      onPress={(event) => {
        markTrayTriggerPressed(trayId);
        onPress?.(event);
        openTray(trayId);
      }}
    >
      {children}
    </Pressable>
  );
};

TrayTrigger.displayName = "TrayTrigger";
