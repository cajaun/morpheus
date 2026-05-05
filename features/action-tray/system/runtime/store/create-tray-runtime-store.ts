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
  stack: [],
  keyboardHeight,
});

const withActiveFromStack = (state: TrayHostStateValue): TrayHostStateValue => {
  const activeEntry = state.stack[state.stack.length - 1];

  return {
    ...state,
    activeTrayId: activeEntry?.trayId ?? null,
    activeIndex: activeEntry?.index ?? 0,
  };
};

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
    if (current.stack.length === 0) {
      return withActiveFromStack(current);
    }

    const nextStack = current.stack
      .filter((entry) => current.registry[entry.trayId])
      .map((entry) => {
        const tray = current.registry[entry.trayId];

        return {
          ...entry,
          index: clampIndex(entry.index, tray?.steps.length ?? 0),
        };
      });

    if (nextStack === current.stack) {
      return current;
    }

    return withActiveFromStack({
      ...current,
      stack: nextStack,
    });
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

      setState((current) => withActiveFromStack({
        ...current,
        stack: [{ trayId: id, index: 0 }],
      }));
    },
    openNestedTray: (id: string, parentTrayId?: string | null) => {
      justOpenedRef.current = true;
      markTrayOpenRequested(id);
      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => withActiveFromStack({
        ...current,
        stack: [
          ...current.stack,
          {
            trayId: id,
            index: 0,
            parentTrayId: parentTrayId ?? current.activeTrayId,
          },
        ],
      }));
    },
    closeActiveTray: () => {
      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        if (current.stack.length === 0) {
          return current;
        }

        return withActiveFromStack({
          ...current,
          stack: current.stack.slice(0, -1),
        });
      });
    },
    requestCloseActiveTray: () => {
      const activeStepOptions = getActiveStepOptions();
      const activeEntry = state.stack[state.stack.length - 1];
      const activeTray = activeEntry ? state.registry[activeEntry.trayId] : undefined;
      const safeIndex = clampIndex(activeEntry?.index ?? 0, activeTray?.steps.length ?? 0);

      if (
        activeStepOptions.fullScreen &&
        activeStepOptions.fullScreenCloseBehavior === "returnToShell" &&
        safeIndex > 0
      ) {
        // fullscreen task steps back out to the shell when the flow asks for that behavior
        setState((current) => {
          const nextStack = current.stack.map((entry, index) =>
            index === current.stack.length - 1
              ? { ...entry, index: Math.max(entry.index - 1, 0) }
              : entry,
          );

          return withActiveFromStack({
            ...current,
            stack: nextStack,
          });
        });
        return;
      }

      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        if (current.stack.length === 0) {
          return current;
        }

        return withActiveFromStack({
          ...current,
          stack: current.stack.slice(0, -1),
        });
      });
    },
    nextStep: () => {
      const activeEntry = state.stack[state.stack.length - 1];
      const activeTray = activeEntry ? state.registry[activeEntry.trayId] : undefined;
      const total = activeTray?.steps.length ?? 0;
      const nextIndex = total <= 0 ? 0 : Math.min((activeEntry?.index ?? 0) + 1, total - 1);

      setState((current) => {
        const activeStackIndex = current.stack.length - 1;
        const currentEntry = current.stack[activeStackIndex];

        if (!currentEntry || nextIndex === currentEntry.index) {
          return current;
        }

        const nextStack = current.stack.map((entry, index) =>
          index === activeStackIndex ? { ...entry, index: nextIndex } : entry,
        );

        return withActiveFromStack({
          ...current,
          stack: nextStack,
        });
      });
    },
    previousStep: () => {
      const activeEntry = state.stack[state.stack.length - 1];
      const nextIndex = Math.max((activeEntry?.index ?? 0) - 1, 0);

      setState((current) => {
        const activeStackIndex = current.stack.length - 1;
        const currentEntry = current.stack[activeStackIndex];

        if (!currentEntry || nextIndex === currentEntry.index) {
          return current;
        }

        const nextStack = current.stack.map((entry, index) =>
          index === activeStackIndex ? { ...entry, index: nextIndex } : entry,
        );

        return withActiveFromStack({
          ...current,
          stack: nextStack,
        });
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
