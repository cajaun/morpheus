import {
  type TrayHostActionsValue,
  type TrayHostStateValue,
  type TrayRuntimeStore,
  type TrayTransitionContract,
} from "../types";
import { createTrayTransitionLifecycle } from "../transition-lifecycle";
import { createTrayRuntimeNavigationActions } from "./tray-runtime-navigation-actions";
import { createTrayRuntimeRegistrationActions } from "./tray-runtime-registration-actions";
import type {
  TrayRuntimeActionContext,
  TrayRuntimeDependencies,
} from "./tray-runtime-action-context";
import { createInitialTrayHostState } from "./tray-runtime-state";

export const createTrayRuntimeStore = (
  initialDependencies: TrayRuntimeDependencies,
): TrayRuntimeStore => {
  let dependencies = initialDependencies;
  let state = createInitialTrayHostState(initialDependencies.keyboardHeight);
  const listeners = new Set<() => void>();
  const justOpenedRef = { current: false };
  const transitions = createTrayTransitionLifecycle();
  let latestTransitionGeneration = 0;
  let pendingPageTransition: TrayTransitionContract | null = null;

  const allocateTransitionGeneration = () => {
    latestTransitionGeneration += 1;
    return latestTransitionGeneration;
  };

  const emitChange = () => {
    // external store subscribers need one notification after each state write
    listeners.forEach((listener) => listener());
  };

  const setState = (
    nextState:
      | TrayHostStateValue
      | ((current: TrayHostStateValue) => TrayHostStateValue),
  ) => {
    const resolvedState =
      typeof nextState === "function" ? nextState(state) : nextState;

    if (resolvedState === state) {
      // identical state skips subscriber work after no op actions
      return;
    }

    if (
      resolvedState.transition !== null &&
      resolvedState.transition !== state.transition
    ) {
      if (
        state.transition?.generation ===
        resolvedState.transition.generation
      ) {
        transitions.replaceContract?.(resolvedState.transition);
      } else {
        transitions.begin(resolvedState.transition);
      }

      if (
        pendingPageTransition !== null &&
        pendingPageTransition.generation !== resolvedState.transition.generation
      ) {
        pendingPageTransition = null;
      }
    }

    state = resolvedState;
    emitChange();
  };

  const actionContext: TrayRuntimeActionContext = {
    getState: () => state,
    setState,
    getDependencies: () => dependencies,
    allocateTransitionGeneration,
    transitions,
    getPendingPageTransition: () => pendingPageTransition,
    setPendingPageTransition: (transition) => {
      pendingPageTransition = transition;
    },
    justOpenedRef,
  };

  const actions: TrayHostActionsValue = {
    ...createTrayRuntimeRegistrationActions(actionContext),
    ...createTrayRuntimeNavigationActions(actionContext),
    anticipateKeyboard: () => {
      dependencies.anticipateKeyboard();
    },
    dismissKeyboardForTray: (trayId?: string | null) => {
      void dependencies.dismissFocusedInputs(trayId);
    },
    registerFocusable: (trayId, ref) =>
      dependencies.registerFocusable(trayId, ref),
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    actions,
    justOpenedRef,
    transitions,
    setDependencies: (nextDependencies) => {
      dependencies = nextDependencies;

      if (state.keyboardHeight === nextDependencies.keyboardHeight) {
        return;
      }

      // mutable dependencies let the store survive provider rerenders
      setState({
        ...state,
        keyboardHeight: nextDependencies.keyboardHeight,
      });
    },
  };
};
