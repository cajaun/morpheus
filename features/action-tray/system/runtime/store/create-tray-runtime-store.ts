import type { SharedValue } from "react-native-reanimated";
import {
  resolveTrayStepOptions,
  type TrayHostActionsValue,
  type TrayHostStateValue,
  type TrayRegistration,
  type TrayRuntimeStore,
} from "../tray-context";
import { markTrayOpenRequested } from "../../telemetry/tray-open-timing";

// the runtime store owns the only source of truth for tray identity and step index
const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

type Dependencies = {
  keyboardHeight: SharedValue<number>;
  anticipateKeyboard: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void | Promise<void>;
  registerFocusable: TrayHostActionsValue["registerFocusable"];
};

const createInitialState = (
  keyboardHeight: SharedValue<number>,
): TrayHostStateValue => ({
  registry: {},
  activeTrayId: null,
  activeIndex: 0,
  keyboardHeight,
});

export const createTrayRuntimeStore = (
  initialDependencies: Dependencies,
): TrayRuntimeStore => {
  let dependencies = initialDependencies;
  let state = createInitialState(initialDependencies.keyboardHeight);
  const listeners = new Set<() => void>();
  const justOpenedRef = { current: false };

  const emitChange = () => {
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
      return;
    }

    state = resolvedState;
    emitChange();
  };

  const resolveClampedState = (current: TrayHostStateValue) => {
    // registration can change under the active tray so the index must be clamped after every write
    if (!current.activeTrayId) {
      if (current.activeIndex === 0) {
        return current;
      }

      return {
        ...current,
        activeIndex: 0,
      };
    }

    const activeTray = current.registry[current.activeTrayId];

    if (!activeTray) {
      return {
        ...current,
        activeTrayId: null,
        activeIndex: 0,
      };
    }

    const safeIndex = clampIndex(current.activeIndex, activeTray.steps.length);

    if (safeIndex === current.activeIndex) {
      return current;
    }

    return {
      ...current,
      activeIndex: safeIndex,
    };
  };

  const getActiveStepOptions = () => {
    // close semantics live on the active step so we resolve options on demand
    if (!state.activeTrayId) {
      return resolveTrayStepOptions();
    }

    const activeTray = state.registry[state.activeTrayId];
    const safeIndex = clampIndex(state.activeIndex, activeTray?.steps.length ?? 0);
    const activeStep = activeTray?.steps[safeIndex];

    return resolveTrayStepOptions(activeStep?.options);
  };

  const actions: TrayHostActionsValue = {
    registerTray: (id: string, registration: TrayRegistration) => {
      setState((current) => {
        if (current.registry[id] === registration) {
          return current;
        }

        const existingPages = current.registry[id]?.pages;

        // step arrays can grow or shrink without changing tray identity
        return resolveClampedState({
          ...current,
          registry: {
            ...current.registry,
            [id]: {
              ...registration,
              pages: existingPages,
            },
          },
        });
      });
    },
    unregisterTray: (id: string) => {
      setState((current) => {
        if (!(id in current.registry)) {
          return current;
        }

        const nextRegistry = { ...current.registry };
        delete nextRegistry[id];

        return resolveClampedState({
          ...current,
          registry: nextRegistry,
          activeTrayId: current.activeTrayId === id ? null : current.activeTrayId,
          activeIndex: current.activeTrayId === id ? 0 : current.activeIndex,
        });
      });
    },
    registerTrayPages: (id, pages) => {
      setState((current) => {
        const registration = current.registry[id];

        if (!registration || registration.pages === pages) {
          return current;
        }

        return {
          ...current,
          registry: {
            ...current.registry,
            [id]: {
              ...registration,
              pages: pages ?? undefined,
            },
          },
        };
      });
    },
    openTray: (id: string) => {
      // blur the old tray first so keyboard state does not leak across tray switches
      justOpenedRef.current = true;
      markTrayOpenRequested(id);
      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => ({
        ...current,
        activeTrayId: id,
        activeIndex: 0,
      }));
    },
    closeActiveTray: () => {
      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        if (current.activeTrayId === null && current.activeIndex === 0) {
          return current;
        }

        return {
          ...current,
          activeTrayId: null,
          activeIndex: 0,
        };
      });
    },
    requestCloseActiveTray: () => {
      const activeStepOptions = getActiveStepOptions();
      const activeTray = state.activeTrayId ? state.registry[state.activeTrayId] : undefined;
      const safeIndex = clampIndex(state.activeIndex, activeTray?.steps.length ?? 0);

      if (
        activeStepOptions.fullScreen &&
        activeStepOptions.fullScreenCloseBehavior === "returnToShell" &&
        safeIndex > 0
      ) {
        // fullscreen task steps back out to the shell when the flow asks for that behavior
        setState((current) => ({
          ...current,
          activeIndex: Math.max(current.activeIndex - 1, 0),
        }));
        return;
      }

      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        if (current.activeTrayId === null && current.activeIndex === 0) {
          return current;
        }

        return {
          ...current,
          activeTrayId: null,
          activeIndex: 0,
        };
      });
    },
    nextStep: () => {
      const activeTray = state.activeTrayId ? state.registry[state.activeTrayId] : undefined;
      const total = activeTray?.steps.length ?? 0;
      const nextIndex = total <= 0 ? 0 : Math.min(state.activeIndex + 1, total - 1);

      setState((current) => {
        if (nextIndex === current.activeIndex) {
          return current;
        }

        return {
          ...current,
          activeIndex: nextIndex,
        };
      });
    },
    previousStep: () => {
      const nextIndex = Math.max(state.activeIndex - 1, 0);

      setState((current) => {
        if (nextIndex === current.activeIndex) {
          return current;
        }

        return {
          ...current,
          activeIndex: nextIndex,
        };
      });
    },
    anticipateKeyboard: () => {
      dependencies.anticipateKeyboard();
    },
    dismissKeyboardForTray: (trayId?: string | null) => {
      void dependencies.dismissFocusedInputs(trayId);
    },
    registerFocusable: (trayId, ref) => dependencies.registerFocusable(trayId, ref),
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
    setDependencies: (nextDependencies) => {
      dependencies = nextDependencies;

      if (state.keyboardHeight === nextDependencies.keyboardHeight) {
        return;
      }

      // dependencies are mutable so the store survives provider rerenders without resubscribe churn
      setState({
        ...state,
        keyboardHeight: nextDependencies.keyboardHeight,
      });
    },
  };
};
