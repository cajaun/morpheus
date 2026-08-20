import type { SharedValue } from "react-native-reanimated";
import type {
  TrayHostActionsValue,
  TrayHostStateValue,
  TrayTransitionContract,
  TrayTransitionLifecycle,
} from "../types";

export type TrayRuntimeDependencies = {
  keyboardHeight: SharedValue<number>;
  anticipateKeyboard: () => void;
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
