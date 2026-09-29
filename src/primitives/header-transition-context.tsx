import React from "react";

export type TrayHeaderTransitionValue = {
  stepKey: string;
  skipEntering: boolean;
  fullScreenBoundaryExit: boolean;
  returnButton?: React.ReactNode;
};

const TrayHeaderTransitionContext =
  React.createContext<TrayHeaderTransitionValue | null>(null);

export const TrayHeaderTransitionProvider =
  TrayHeaderTransitionContext.Provider;

export const useTrayHeaderTransition = () =>
  React.useContext(TrayHeaderTransitionContext);
