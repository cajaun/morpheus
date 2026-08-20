import type { SharedValue } from "react-native-reanimated";
import {
  type TrayHostActionsValue,
  type TrayHostStateValue,
  type TrayRegistration,
  type TrayRuntimeStore,
  type TrayTransitionContract,
} from "../types";
import { markTrayOpenRequested } from "../../telemetry/tray-open-timing";
import { areTrayRegistrationsEquivalent } from "../registration-equality";
import { createTrayTransitionContract } from "../transition-contract";
import { createTrayTransitionLifecycle } from "../transition-lifecycle";
import {
  clampTrayRuntimeState,
  clampTrayStepIndex,
  createInitialTrayHostState,
  reconcileTransitionAfterRegistration,
  resolveActiveStepOptions,
  resolveActiveTrayEndpoint,
  resolveSharedRegions,
  withActiveTrayFromStack,
  withTrayTransition,
} from "./tray-runtime-state";

type Dependencies = {
  keyboardHeight: SharedValue<number>;
  anticipateKeyboard: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void | Promise<void>;
  registerFocusable: TrayHostActionsValue["registerFocusable"];
};

export const createTrayRuntimeStore = (
  initialDependencies: Dependencies,
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
    // use sync external store subscribers need a single emit after each state write
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
      // returning the same object skips subscriber work after no op actions
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

  const actions: TrayHostActionsValue = {
    registerTray: (id: string, registration: TrayRegistration) => {
      setState((current) => {
        if (areTrayRegistrationsEquivalent(current.registry[id], registration)) {
          return current;
        }

        const existingPages = current.registry[id]?.pages;

        // step arrays can grow or shrink without changing tray identity
        const next = clampTrayRuntimeState({
          ...current,
          registry: {
            ...current.registry,
            [id]: {
              ...registration,
              pages: existingPages,
            },
          },
        });

        return reconcileTransitionAfterRegistration(current, next, id);
      });
    },
    unregisterTray: (id: string) => {
      setState((current) => {
        if (!(id in current.registry)) {
          return current;
        }

        const nextRegistry = { ...current.registry };
        delete nextRegistry[id];

        const next = clampTrayRuntimeState({
          ...current,
          registry: nextRegistry,
        });

        if (current.stack.some((entry) => entry.trayId === id)) {
          return withTrayTransition(
            current,
            next,
            current.stack.length > 1 ? "closeNested" : "dismiss",
            allocateTransitionGeneration(),
          );
        }

        return next;
      });
    },
    registerTrayPages: (id, pages) => {
      setState((current) => {
        const registration = current.registry[id];

        if (!registration || registration.pages === pages) {
          return current;
        }

        // page registration is stored beside steps so flow navigation can delegate to pages
        const next = {
          ...current,
          registry: {
            ...current.registry,
            [id]: {
              ...registration,
              pages: pages ?? undefined,
            },
          },
        };

        const previousPages = registration.pages;
        const recordsPageChange =
          pages !== null &&
          previousPages !== undefined &&
          previousPages.stepKey === pages.stepKey &&
          previousPages.pageIndex !== pages.pageIndex;

        if (!recordsPageChange) {
          return next;
        }

        const pendingTransition = pendingPageTransition;
        pendingPageTransition = null;

        if (
          pendingTransition?.to?.trayId === id &&
          pendingTransition.to.stepKey === pages.stepKey &&
          pendingTransition.to.pageIndex === pages.pageIndex
        ) {
          return {
            ...next,
            transitionGeneration: pendingTransition.generation,
            transition: pendingTransition,
          };
        }

        return withTrayTransition(
          current,
          next,
          "pageChange",
          allocateTransitionGeneration(),
        );
      });
    },
    openTray: (id: string) => {
      // blur the old tray first so keyboard state does not leak across tray switches
      justOpenedRef.current = true;
      markTrayOpenRequested(id);
      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) =>
        withTrayTransition(
          current,
          withActiveTrayFromStack({
            ...current,
            stack: [{ trayId: id, index: 0 }],
          }),
          "open",
          allocateTransitionGeneration(),
        ),
      );
    },
    openNestedTray: (id: string, parentTrayId?: string | null) => {
      justOpenedRef.current = true;
      markTrayOpenRequested(id);
      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) =>
        withTrayTransition(
          current,
          withActiveTrayFromStack({
            ...current,
            stack: [
              ...current.stack,
              {
                trayId: id,
                index: 0,
                // parent scope lets nested trays advance parent pages after closing
                parentTrayId: parentTrayId ?? current.activeTrayId,
              },
            ],
          }),
          "openNested",
          allocateTransitionGeneration(),
        ),
      );
    },
    closeActiveTray: () => {
      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        if (current.stack.length === 0) {
          return current;
        }

        const next = withActiveTrayFromStack({
          ...current,
          stack: current.stack.slice(0, -1),
        });

        return withTrayTransition(
          current,
          next,
          current.stack.length > 1 ? "closeNested" : "dismiss",
          allocateTransitionGeneration(),
        );
      });
    },
    requestCloseActiveTray: () => {
      const activeStepOptions = resolveActiveStepOptions(state);
      const activeEntry = state.stack[state.stack.length - 1];
      const activeTray = activeEntry ? state.registry[activeEntry.trayId] : undefined;
      const safeIndex = clampTrayStepIndex(activeEntry?.index ?? 0, activeTray?.steps.length ?? 0);

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

          return withTrayTransition(
            current,
            withActiveTrayFromStack({
              ...current,
              stack: nextStack,
            }),
            "returnToShell",
            allocateTransitionGeneration(),
          );
        });
        return;
      }

      void dependencies.dismissFocusedInputs(state.activeTrayId);

      setState((current) => {
        if (current.stack.length === 0) {
          return current;
        }

        const next = withActiveTrayFromStack({
          ...current,
          stack: current.stack.slice(0, -1),
        });

        return withTrayTransition(
          current,
          next,
          current.stack.length > 1 ? "closeNested" : "dismiss",
          allocateTransitionGeneration(),
        );
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
          // no op navigation should not wake presenter subscribers
          return current;
        }

        const nextStack = current.stack.map((entry, index) =>
          index === activeStackIndex ? { ...entry, index: nextIndex } : entry,
        );

        return withTrayTransition(
          current,
          withActiveTrayFromStack({
            ...current,
            stack: nextStack,
          }),
          "nextStep",
          allocateTransitionGeneration(),
        );
      });
    },
    previousStep: () => {
      const activeEntry = state.stack[state.stack.length - 1];
      const nextIndex = Math.max((activeEntry?.index ?? 0) - 1, 0);

      setState((current) => {
        const activeStackIndex = current.stack.length - 1;
        const currentEntry = current.stack[activeStackIndex];

        if (!currentEntry || nextIndex === currentEntry.index) {
          // clamped back navigation stays silent at the first step
          return current;
        }

        const nextStack = current.stack.map((entry, index) =>
          index === activeStackIndex ? { ...entry, index: nextIndex } : entry,
        );

        return withTrayTransition(
          current,
          withActiveTrayFromStack({
            ...current,
            stack: nextStack,
          }),
          "previousStep",
          allocateTransitionGeneration(),
        );
      });
    },
    requestPageTransition: (
      trayId,
      stepKey,
      fromPageIndex,
      toPageIndex,
    ) => {
      const from = resolveActiveTrayEndpoint(state);

      if (
        !from ||
        from.trayId !== trayId ||
        from.stepKey !== stepKey ||
        fromPageIndex === toPageIndex
      ) {
        return null;
      }

      const generation = allocateTransitionGeneration();
      const contract = createTrayTransitionContract({
        generation,
        reason: "pageChange",
        from: {
          ...from,
          pageIndex: fromPageIndex,
        },
        to: {
          ...from,
          pageIndex: toPageIndex,
        },
        sharedRegions: resolveSharedRegions(
          state,
          state,
          { ...from, pageIndex: fromPageIndex },
          { ...from, pageIndex: toPageIndex },
        ),
      });

      pendingPageTransition = contract;
      transitions.begin(contract);
      return generation;
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
    transitions,
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
