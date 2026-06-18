import React, { useEffect, useId, useLayoutEffect, useMemo } from "react";
import {
  TrayScopeProvider,
  useTrayHostActions,
  type TrayRegistration,
  type TrayStepDefinition,
  type TrayTransitionOptions,
} from "./tray-context";

// root turns local step definitions into a runtime registration entry
type TrayRootProps = {
  id?: string;
  children: React.ReactNode;
  steps: TrayStepDefinition[];
  footer?: React.ReactNode;
  dismissible?: boolean;
  transition?: TrayTransitionOptions;
};

export const TrayRoot: React.FC<TrayRootProps> = ({
  id,
  children,
  steps,
  footer,
  dismissible,
  transition,
}) => {
  const reactId = useId();
  // explicit ids support deterministic tests and cross component references
  const trayId = useMemo(() => id ?? `tray-${reactId}`, [id, reactId]);
  const { registerTray, unregisterTray } = useTrayHostActions();
  const registration = useMemo<TrayRegistration>(
    () => ({
      steps,
      footer,
      dismissible,
      transition,
    }),
    [dismissible, footer, steps, transition],
  );

  useLayoutEffect(() => {
    // Step definitions must reach the presenter before paint so dynamic keys
    // do not spend an extra frame in the passive-effect queue.
    registerTray(trayId, registration);
  }, [registration, registerTray, trayId]);

  useEffect(
    () => () => {
      // unmount should clear the registry entry even if the tray was active
      unregisterTray(trayId);
    },
    [trayId, unregisterTray],
  );

  return <TrayScopeProvider value={trayId}>{children}</TrayScopeProvider>;
};

TrayRoot.displayName = "TrayRoot";
