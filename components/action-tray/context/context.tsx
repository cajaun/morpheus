import React, { createContext, useContext } from "react";

export type TrayDefinition = {
  contents: (() => React.ReactElement)[];
  footer?: () => React.ReactElement;
};

export type TrayContextValue = {
  activeTrayId: string | null;
  openTray: (id: string) => void;
  close: () => void;
  requestClose: () => void;
  next: () => void;
  back: () => void;
  index: number;
  total: number;
  anticipateKeyboard: () => void;
  registerTray: (id: string, def: TrayDefinition) => void;
  registerFocusable: (
    trayId: string | null,
    ref: React.RefObject<any>,
  ) => () => void;
  dismissKeyboard: () => void;
};

const TrayContext = createContext<TrayContextValue | null>(null);

export const useTray = () => {
  const ctx = useContext(TrayContext);
  if (!ctx) throw new Error("Must be used within TrayProvider");
  return ctx;
};

export { TrayContext };
