// define the services shared by runtime action modules
import type {
  TrayHostStateValue,
  TrayTransitionContract,
  TrayTransitionLifecycle,
} from "../types";

export type TrayRuntimeActionContext = {
  getState: () => TrayHostStateValue;
  setState: (
    nextState:
      | TrayHostStateValue
      | ((current: TrayHostStateValue) => TrayHostStateValue),
  ) => void;
  allocateTransitionGeneration: () => number;
  transitions: TrayTransitionLifecycle;
  getPendingPageTransition: () => TrayTransitionContract | null;
  setPendingPageTransition: (
    transition: TrayTransitionContract | null,
  ) => void;
  justOpenedRef: { current: boolean };
};
