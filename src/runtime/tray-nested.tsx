import React, { useEffect, useId, useMemo, useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
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
import { useTrayPages } from "../pages-context";

// whether the tray's pages rest, driven by the page clock, the fallback clock outside Tray.Pages always rests
const usePagesAtRest = () => {
  const { pageIndex, progress } = useTrayPages();
  // read once on mount so a trigger mounted mid page transition starts deferred
  const [atRest, setAtRest] = useState(
    () => Math.abs(progress.value - pageIndex) < 0.001,
  );

  useAnimatedReaction(
    () => Math.abs(progress.value - pageIndex) < 0.001,
    (rest, previous) => {
      if (rest !== previous) {
        scheduleOnRN(setAtRest, rest);
      }
    },
    [pageIndex, progress],
  );

  return atRest;
};

export type TrayNestedProps = Omit<PressableProps, "onPress"> & {
  id?: string;
  children: React.ReactNode;
  stepOptions?: TrayStepOptions;
  footer?: React.ReactNode;
  transition?: TrayTransitionOptions;
  onPress?: PressableProps["onPress"];
};

// register a nested tray and keep its parent scope for triggers
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
  // register at once so the tray can open, the hidden prepared host builds after the parent's step or page transition completes
  const parentTransitionSettled = useParentTransitionSettled();
  const pagesAtRest = usePagesAtRest();
  const deferHostPreparation = !parentTransitionSettled || !pagesAtRest;
  const registration = useMemo<TrayRegistration>(
    () => ({
      steps,
      footer,
      transition,
      parentTrayId: parentTrayId ?? undefined,
      ...(deferHostPreparation ? { deferHostPreparation: true } : null),
    }),
    [deferHostPreparation, footer, parentTrayId, steps, transition],
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
