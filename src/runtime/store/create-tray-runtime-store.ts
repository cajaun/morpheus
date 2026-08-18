import type { SharedValue } from "react-native-reanimated";
import {
  resolveTrayStepOptions,
  type TrayHostActionsValue,
  type TrayHostStateValue,
  type TrayRegistration,
  type TrayRuntimeStore,
} from "../tray-context";
import { markTrayOpenRequested } from "../../telemetry/tray-open-timing";
import {
  createTrayTransitionContract,
  resolveTrayPresentationEndpoint,
} from "../transition-contract";
import type {
  TrayPresentationEndpoint,
  TraySharedRegionContract,
  TrayTransitionContract,
  TrayTransitionReason,
} from "../types";
import { areTrayRegistrationsEquivalent } from "../registration-equality";
import { createTrayTransitionLifecycle } from "../transition-lifecycle";

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
  transitionGeneration: 0,
  transition: null,
  keyboardHeight,
});

const withActiveFromStack = (state: TrayHostStateValue): TrayHostStateValue => {
  const activeEntry = state.stack[state.stack.length - 1];

  // active tray mirrors the stack top so nested trays can take focus
  return {
    ...state,
    activeTrayId: activeEntry?.trayId ?? null,
    activeIndex: activeEntry?.index ?? 0,
  };
};

const resolveActiveEndpoint = (state: TrayHostStateValue) => {
  const entry = state.stack[state.stack.length - 1];

  return resolveTrayPresentationEndpoint({
    entry,
    registration: entry ? state.registry[entry.trayId] : undefined,
  });
};

const resolveEndpointPresentation = (
  state: TrayHostStateValue,
  endpoint: TrayPresentationEndpoint | null,
) => {
  if (!endpoint) {
    return null;
  }

  const registration = state.registry[endpoint.trayId];
  const step = registration?.steps[endpoint.stepIndex];

  return step && registration ? { registration, step } : null;
};

const resolveSharedRegions = (
  current: TrayHostStateValue,
  next: TrayHostStateValue,
  from: TrayPresentationEndpoint | null,
  to: TrayPresentationEndpoint | null,
): TraySharedRegionContract[] => {
  const source = resolveEndpointPresentation(current, from);
  const target = resolveEndpointPresentation(next, to);
  const sameRoot = from?.trayId === to?.trayId;
  const sameStep = sameRoot && from?.stepKey === to?.stepKey;
  const sourceHeader = source?.step.header;
  const targetHeader = target?.step.header;
  const sourceFooter = source?.registration.footer;
  const targetFooter = target?.registration.footer;

  return [
    {
      region: "surface",
      behavior: sameRoot ? "persistent" : "replace",
      sourceId: from ? `${from.trayId}:surface` : undefined,
      targetId: to ? `${to.trayId}:surface` : undefined,
    },
    {
      region: "header",
      behavior:
        sourceHeader == null && targetHeader == null
          ? "absent"
          : sourceHeader === targetHeader
            ? "persistent"
            : "keyedOverlap",
      sourceId: sourceHeader && from
        ? `${from.trayId}:${from.stepKey}:header`
        : undefined,
      targetId: targetHeader && to
        ? `${to.trayId}:${to.stepKey}:header`
        : undefined,
    },
    {
      region: "body",
      behavior: sameStep ? "persistent" : "replace",
      sourceId: from ? `${from.trayId}:${from.stepKey}:body` : undefined,
      targetId: to ? `${to.trayId}:${to.stepKey}:body` : undefined,
    },
    {
      region: "footer",
      behavior:
        sourceFooter == null && targetFooter == null
          ? "absent"
          : sourceFooter === targetFooter
            ? "persistent"
            : "keyedOverlap",
      sourceId: sourceFooter && from ? `${from.trayId}:footer` : undefined,
      targetId: targetFooter && to ? `${to.trayId}:footer` : undefined,
    },
  ];
};

const withTransition = (
  current: TrayHostStateValue,
  next: TrayHostStateValue,
  reason: TrayTransitionReason,
  generation: number,
): TrayHostStateValue => {
  const from = resolveActiveEndpoint(current);
  const to = resolveActiveEndpoint(next);

  return {
    ...next,
    transitionGeneration: generation,
    transition: createTrayTransitionContract({
      generation,
      reason,
      from,
      to,
      sharedRegions: resolveSharedRegions(current, next, from, to),
    }),
  };
};

const reconcileTransitionAfterRegistration = (
  current: TrayHostStateValue,
  next: TrayHostStateValue,
  trayId: string,
): TrayHostStateValue => {
  const existingTransition = current.transition;
  const activeEntry = next.stack[next.stack.length - 1];

  if (
    !existingTransition ||
    !activeEntry ||
    activeEntry.trayId !== trayId ||
    existingTransition.to?.trayId !== trayId ||
    existingTransition.to.stepIndex !== activeEntry.index
  ) {
    return next;
  }

  const nextTarget = resolveActiveEndpoint(next);

  if (!nextTarget) {
    return next;
  }

  const targetChanged =
    existingTransition.to.stepKey !== nextTarget.stepKey ||
    existingTransition.to.mode !== nextTarget.mode ||
    existingTransition.to.pageIndex !== nextTarget.pageIndex;

  if (!targetChanged) {
    return next;
  }

  // Registration can settle after navigation when a step's authored options
  // depend on the same event that requested next(). Keep one generation, but
  // repair its target before the presenter commits the visual snapshot.
  return {
    ...next,
    transition: createTrayTransitionContract({
      generation: existingTransition.generation,
      reason: existingTransition.reason,
      from: existingTransition.from,
      to: nextTarget,
      sharedRegions: resolveSharedRegions(
        current,
        next,
        existingTransition.from,
        nextTarget,
      ),
    }),
  };
};

export const createTrayRuntimeStore = (
  initialDependencies: Dependencies,
): TrayRuntimeStore => {
  let dependencies = initialDependencies;
  let state = createInitialState(initialDependencies.keyboardHeight);
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
      // returning the same object skips subscriber work after no-op actions
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
        if (areTrayRegistrationsEquivalent(current.registry[id], registration)) {
          return current;
        }

        const existingPages = current.registry[id]?.pages;

        // step arrays can grow or shrink without changing tray identity
        const next = resolveClampedState({
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

        const next = resolveClampedState({
          ...current,
          registry: nextRegistry,
        });

        if (current.stack.some((entry) => entry.trayId === id)) {
          return withTransition(
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

        return withTransition(
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
        withTransition(
          current,
          withActiveFromStack({
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
        withTransition(
          current,
          withActiveFromStack({
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

        const next = withActiveFromStack({
          ...current,
          stack: current.stack.slice(0, -1),
        });

        return withTransition(
          current,
          next,
          current.stack.length > 1 ? "closeNested" : "dismiss",
          allocateTransitionGeneration(),
        );
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

          return withTransition(
            current,
            withActiveFromStack({
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

        const next = withActiveFromStack({
          ...current,
          stack: current.stack.slice(0, -1),
        });

        return withTransition(
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
          // no-op navigation should not wake presenter subscribers
          return current;
        }

        const nextStack = current.stack.map((entry, index) =>
          index === activeStackIndex ? { ...entry, index: nextIndex } : entry,
        );

        return withTransition(
          current,
          withActiveFromStack({
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

        return withTransition(
          current,
          withActiveFromStack({
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
      const from = resolveActiveEndpoint(state);

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
