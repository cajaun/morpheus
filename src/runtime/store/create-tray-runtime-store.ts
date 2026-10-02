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

// create the external store that joins navigation state to lifecycle records
export const createTrayRuntimeStore = (
  initialDependencies: TrayRuntimeDependencies,
): TrayRuntimeStore => {
  let dependencies = initialDependencies;
  let state = createInitialTrayHostState();
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
    let resolvedState =
      typeof nextState === "function" ? nextState(state) : nextState;

    if (resolvedState === state) {
      // identical state skips subscriber work after no op actions
      return;
    }

    if (
      resolvedState.lastTransition !== null &&
      resolvedState.lastTransition !== state.lastTransition
    ) {
      if (
        state.lastTransition?.generation ===
        resolvedState.lastTransition.generation
      ) {
        const refined = transitions.refineContract(resolvedState.lastTransition);

        if (refined !== false) {
          // the descriptor is still provisional and may be refined in place
        } else {
          // a sealed descriptor cannot be rewritten reissue the transition atomically so the lifecycle and presenter share one new identity
          const generation = allocateTransitionGeneration();
          const reissuedTransition = {
            ...resolvedState.lastTransition,
            generation,
          };
          resolvedState = {
            ...resolvedState,
            transitionGeneration: generation,
            lastTransition: reissuedTransition,
          };
          transitions.begin(reissuedTransition);
        }
      } else {
        transitions.begin(resolvedState.lastTransition);
      }

      if (
        pendingPageTransition !== null &&
        pendingPageTransition.generation !== resolvedState.lastTransition?.generation
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
    prepareKeyboardHandoff: () => {
      dependencies.prepareKeyboardHandoff();
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
    },
  };
};
