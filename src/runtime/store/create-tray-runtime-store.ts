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
  HeldNavigation,
  TrayRuntimeActionContext,
  TrayRuntimeDependencies,
} from "./tray-runtime-action-context";
import { createInitialTrayHostState } from "./tray-runtime-state";
import { markTrayBoundaryRequested } from "../../telemetry/tray-boundary-timing";

// the external store joining navigation state to lifecycle records
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
  let heldNavigation: HeldNavigation | null = null;

  const allocateTransitionGeneration = () => {
    latestTransitionGeneration += 1;
    return latestTransitionGeneration;
  };

  const emitChange = () => {
    // subscribers get one notification per state write
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
      // identical state skips subscriber work
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
          // a provisional descriptor can be refined in place
        } else {
          // a sealed descriptor is reissued atomically so lifecycle and presenter share one new identity
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

      const finalTransition = resolvedState.lastTransition!;
      const activeTrayId =
        resolvedState.stack[resolvedState.stack.length - 1]?.trayId ??
        finalTransition.to?.trayId ??
        finalTransition.from?.trayId;

      markTrayBoundaryRequested(activeTrayId, finalTransition);

      if (
        pendingPageTransition !== null &&
        pendingPageTransition.generation !== finalTransition.generation
      ) {
        pendingPageTransition = null;
      }
    }

    state = resolvedState;
    emitChange();
  };

  // a held step change runs once its boundary completes, a boundary cut short by anything else drops it
  transitions.subscribeSettled?.((generation, phase) => {
    const held = heldNavigation;

    if (held === null || held.generation !== generation) {
      return;
    }

    heldNavigation = null;

    if (
      phase === "completed" &&
      state.stack[state.stack.length - 1]?.trayId === held.trayId
    ) {
      held.run();
    }
  });

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
    holdNavigation: (held) => {
      heldNavigation = held;
    },
    dropHeldNavigation: () => {
      heldNavigation = null;
    },
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
