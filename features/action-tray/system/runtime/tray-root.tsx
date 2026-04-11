import React, { useEffect, useId, useMemo } from "react";
import {
  TrayScopeProvider,
  useTrayHostActions,
  type TrayRegistration,
  type TrayStepDefinition,
} from "./tray-context";

// root turns local step definitions into a runtime registration entry
type TrayRootProps = {
  id?: string;
  children: React.ReactNode;
  steps: TrayStepDefinition[];
  footer?: React.ReactNode;
};

export const TrayRoot: React.FC<TrayRootProps> = ({
  id,
  children,
  steps,
  footer,
}) => {
  const reactId = useId();
  // explicit ids support deterministic tests and cross component references
  const trayId = useMemo(() => id ?? `tray-${reactId}`, [id, reactId]);
  const { registerTray, unregisterTray } = useTrayHostActions();
  const registration = useMemo<TrayRegistration>(
    () => ({
      steps,
      footer,
    }),
    [footer, steps],
  );

  useEffect(() => {
    // registration tracks react lifetime so the store never sees phantom trays
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
