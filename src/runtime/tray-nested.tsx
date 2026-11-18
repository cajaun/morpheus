import React, { useEffect, useId, useMemo } from "react";
import { Pressable, type PressableProps } from "react-native";
import {
  useTrayHostActions,
  useTrayScope,
  type TrayRegistration,
  type TrayStepOptions,
  type TrayTransitionOptions,
} from "./tray-context";
import { compileTraySteps } from "./tray-step-compiler";
import { useParentTransitionSettled } from "./tray-parent-transition";

export type TrayNestedProps = Omit<PressableProps, "onPress"> & {
  id?: string;
  children: React.ReactNode;
  stepOptions?: TrayStepOptions;
  footer?: React.ReactNode;
  transition?: TrayTransitionOptions;
  onPress?: PressableProps["onPress"];
};

// register a child tray and open it from the current tray scope
// register a nested tray while keeping its parent scope available to triggers
export const TrayNested: React.FC<TrayNestedProps> = ({
  id,
  children,
  stepOptions,
  footer,
  transition,
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
  const steps = useMemo(
    () => compileTraySteps(children, stepOptions),
    [children, stepOptions],
  );
  // A nested tray usually mounts with its parent's step content, in the middle
  // of the parent's transition. Register right away so it can always open,
  // but let the presenter build its hidden prepared host only after that
  // transition completes, so the host mount stays off its critical path.
  const parentTransitionSettled = useParentTransitionSettled();
  const registration = useMemo<TrayRegistration>(
    () => ({
      steps,
      footer,
      transition,
      parentTrayId: parentTrayId ?? undefined,
      ...(parentTransitionSettled ? null : { deferHostPreparation: true }),
    }),
    [footer, parentTrayId, parentTransitionSettled, steps, transition],
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
