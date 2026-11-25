// services shared by the runtime action modules
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
  // a step change that would cut off an in-flight fullscreen boundary waits for it, the latest one wins
  holdNavigation: (held: HeldNavigation) => void;
  dropHeldNavigation: () => void;
};

export type HeldNavigation = {
  // the boundary transition the step change waits for
  generation: number;
  trayId: string;
  run: () => void;
};
