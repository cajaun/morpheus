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

// Whether the tray's pages (if any) are at rest. Driven by the page clock (a
// UI-thread shared value), not timers. Outside Tray.Pages the fallback clock
// is always at rest.
const usePagesAtRest = () => {
  const { pageIndex, progress } = useTrayPages();
  // read once on mount, so a trigger mounted mid page transition starts deferred
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
  // The same holds for a page transition: a trigger swapped in as a page
  // changes would otherwise mount the hidden host during the page spring.
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
