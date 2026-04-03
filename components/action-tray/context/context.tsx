import React, { createContext, useContext } from "react";

export type TrayDefinition = {
  contents: ((
    stepKey?: string,
    skipEntering?: boolean,
    skipExiting?: boolean,
    step?: number,
    total?: number,
    fullScreen?: boolean
  ) => React.ReactNode)[];
  footer?: (step?: number, total?: number) => React.ReactNode;
  fullScreenSteps?: boolean[];
};

export type TrayContextValue = {
  activeTrayId: string | null; 
  openTray: (id: string) => void;
  close: () => void;
  next: () => void;
  back: () => void;
  index: number;
  total: number;
  registerTray: (id: string, def: TrayDefinition) => void;
  registerFocusable: (ref: React.RefObject<any>) => void;
};

const TrayContext = createContext<TrayContextValue | null>(null);

export const useTray = () => {
  const ctx = useContext(TrayContext);
  if (!ctx) throw new Error("Must be used within TrayProvider");
  return ctx;
};

export { TrayContext };