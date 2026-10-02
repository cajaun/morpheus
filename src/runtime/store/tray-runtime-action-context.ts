// define the services shared by runtime action modules
import type {
  TrayHostActionsValue,
  TrayHostStateValue,
  TrayTransitionContract,
  TrayTransitionLifecycle,
} from "../types";

export type TrayRuntimeDependencies = {
  anticipateKeyboard: () => void;
  prepareKeyboardHandoff: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void | Promise<void>;
  registerFocusable: TrayHostActionsValue["registerFocusable"];
};

export type TrayRuntimeActionContext = {
  getState: () => TrayHostStateValue;
  setState: (
    nextState:
      | TrayHostStateValue
      | ((current: TrayHostStateValue) => TrayHostStateValue),
  ) => void;
  getDependencies: () => TrayRuntimeDependencies;
  allocateTransitionGeneration: () => number;
  transitions: TrayTransitionLifecycle;
  getPendingPageTransition: () => TrayTransitionContract | null;
  setPendingPageTransition: (
    transition: TrayTransitionContract | null,
  ) => void;
  justOpenedRef: { current: boolean };
};
