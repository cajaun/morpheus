import React, { useEffect, useId, useMemo } from "react";
import { useProfiledTrayLayoutEffect } from "../telemetry/tray-layout-effect-profiler";
import {
  TrayScopeProvider,
  useTrayHostActions,
  type TrayRegistration,
  type TrayStepOptions,
  type TrayTransitionOptions,
} from "./tray-context";
import { compileTraySteps } from "./tray-step-compiler";

// root turns local step definitions into a runtime registration entry
export type TrayRootProps = {
  id?: string;
  children: React.ReactNode;
  stepOptions?: TrayStepOptions;
  footer?: React.ReactNode;
  dismissible?: boolean;
  transition?: TrayTransitionOptions;
};

// register a root tray and expose its scoped navigation entry point
export const TrayRoot: React.FC<TrayRootProps> = ({
  id,
  children,
  stepOptions,
  footer,
  dismissible,
  transition,
}) => {
  const reactId = useId();
  // explicit ids support deterministic tests and cross-component references
  const trayId = useMemo(() => id ?? `tray-${reactId}`, [id, reactId]);
  const { registerTray, unregisterTray } = useTrayHostActions();
  const steps = useMemo(
    () => compileTraySteps(children, stepOptions),
    [children, stepOptions],
  );
  const registration = useMemo<TrayRegistration>(
    () => ({
      // the memoized registration keeps identity until authored inputs change
      steps,
      footer,
      dismissible,
      transition,
    }),
    [dismissible, footer, steps, transition],
  );

  useProfiledTrayLayoutEffect("TrayRoot.registerTray", () => {
    // register before paint so dynamic keys skip an extra passive frame
    registerTray(trayId, registration);
  }, [registration, registerTray, trayId]);

  useEffect(
    () => () => {
      // unmount clears the registry entry even for an active tray
      unregisterTray(trayId);
    },
    [trayId, unregisterTray],
  );

  return (
    // the scope lets triggers and navigation hooks find the nearest registration
    <TrayScopeProvider value={trayId}>{children}</TrayScopeProvider>
  );
};

TrayRoot.displayName = "TrayRoot";
