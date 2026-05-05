import React, { useEffect, useId, useMemo } from "react";
import { Pressable, type PressableProps } from "react-native";
import {
  useTrayHostActions,
  useTrayScope,
  type TrayRegistration,
  type TrayStepDefinition,
} from "./tray-context";

type TrayNestedProps = Omit<PressableProps, "onPress"> & {
  id?: string;
  children: React.ReactNode;
  steps: TrayStepDefinition[];
  footer?: React.ReactNode;
  onPress?: PressableProps["onPress"];
};

export const TrayNested: React.FC<TrayNestedProps> = ({
  id,
  children,
  steps,
  footer,
  onPress,
  ...rest
}) => {
  const parentTrayId = useTrayScope();
  const reactId = useId();
  const trayId = useMemo(
    () => id ?? `${parentTrayId ?? "tray"}-nested-${reactId}`,
    [id, parentTrayId, reactId],
  );
  const { registerTray, unregisterTray, openNestedTray } = useTrayHostActions();
  const registration = useMemo<TrayRegistration>(
    () => ({
      steps,
      footer,
    }),
    [footer, steps],
  );

  useEffect(() => {
    registerTray(trayId, registration);
  }, [registration, registerTray, trayId]);

  useEffect(
    () => () => {
      unregisterTray(trayId);
    },
    [trayId, unregisterTray],
  );

  return (
    <Pressable
      {...rest}
      onPress={(event) => {
        onPress?.(event);
        openNestedTray(trayId, parentTrayId);
      }}
    >
      {children}
    </Pressable>
  );
};

TrayNested.displayName = "TrayNested";
