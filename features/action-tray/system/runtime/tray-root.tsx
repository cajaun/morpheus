import React, { useEffect, useId, useMemo } from "react";
import {
  TrayScopeProvider,
  useTrayHostActions,
  type TrayRegistration,
  type TrayStepDefinition,
} from "./tray-context";

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
    registerTray(trayId, registration);
  }, [registration, registerTray, trayId]);

  useEffect(
    () => () => {
      unregisterTray(trayId);
    },
    [trayId, unregisterTray],
  );

  return <TrayScopeProvider value={trayId}>{children}</TrayScopeProvider>;
};

TrayRoot.displayName = "TrayRoot";
