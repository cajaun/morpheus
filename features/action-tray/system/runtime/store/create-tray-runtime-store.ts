import type { SharedValue } from "react-native-reanimated";
import {
  resolveTrayStepOptions,
  type TrayHostActionsValue,
  type TrayHostStateValue,
  type TrayRegistration,
  type TrayRuntimeStore,
} from "../tray-context";
import { markTrayOpenRequested } from "../../telemetry/tray-open-timing";

const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

type Dependencies = {
  keyboardHeight: SharedValue<number>;
  anticipateKeyboard: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void;
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

        return resolveClampedState({
          ...current,
          registry: {
            ...current.registry,
            [id]: registration,
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
    openTray: (id: string) => {
      dependencies.dismissFocusedInputs(state.activeTrayId);
      justOpenedRef.current = true;
      markTrayOpenRequested(id);

      setState((current) => ({
        ...current,
        activeTrayId: id,
        activeIndex: 0,
      }));
    },
    closeActiveTray: () => {
      dependencies.dismissFocusedInputs(state.activeTrayId);

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
      dependencies.dismissFocusedInputs(state.activeTrayId);

      const activeStepOptions = getActiveStepOptions();
      const activeTray = state.activeTrayId ? state.registry[state.activeTrayId] : undefined;
      const safeIndex = clampIndex(state.activeIndex, activeTray?.steps.length ?? 0);

      if (
        activeStepOptions.fullScreen &&
        activeStepOptions.fullScreenCloseBehavior === "returnToShell" &&
        safeIndex > 0
      ) {
        setState((current) => ({
          ...current,
          activeIndex: Math.max(current.activeIndex - 1, 0),
        }));
        return;
      }

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
      dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        const activeTray = current.activeTrayId
          ? current.registry[current.activeTrayId]
          : undefined;
        const total = activeTray?.steps.length ?? 0;
        const nextIndex = total <= 0 ? 0 : Math.min(current.activeIndex + 1, total - 1);

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
      dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        const nextIndex = Math.max(current.activeIndex - 1, 0);

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
      dependencies.dismissFocusedInputs(trayId);
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

      setState({
        ...state,
        keyboardHeight: nextDependencies.keyboardHeight,
      });
    },
  };
};
