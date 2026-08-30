import React, { useEffect, useId, useLayoutEffect, useMemo } from "react";
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
  // explicit ids support deterministic tests and cross component references
  const trayId = useMemo(() => id ?? `tray-${reactId}`, [id, reactId]);
  const { registerTray, unregisterTray } = useTrayHostActions();
  const steps = useMemo(
    () => compileTraySteps(children, stepOptions),
    [children, stepOptions],
  );
  const registration = useMemo<TrayRegistration>(
    () => ({
      // memoized registration preserves identity until authored tray inputs change
      steps,
      footer,
      dismissible,
      transition,
    }),
    [dismissible, footer, steps, transition],
  );

  useLayoutEffect(() => {
    // register steps before paint so dynamic keys avoid an extra passive frame
    registerTray(trayId, registration);
  }, [registration, registerTray, trayId]);

  useEffect(
    () => () => {
      // unmount should clear the registry entry even if the tray was active
      unregisterTray(trayId);
    },
    [trayId, unregisterTray],
  );

  return (
    // scope lets triggers and flow hooks resolve the nearest tray registration
    <TrayScopeProvider value={trayId}>{children}</TrayScopeProvider>
  );
};

TrayRoot.displayName = "TrayRoot";
