import type { TrayHostActionsValue } from "../types";
import { markTrayOpenRequested } from "../../telemetry/tray-open-timing";
import { createTrayTransitionContract } from "../transition-contract";
import {
  clampTrayStepIndex,
  resolveActiveStepOptions,
  resolveActiveTrayEndpoint,
  resolveSharedRegions,
  withActiveTrayFromStack,
  withTrayTransition,
} from "./tray-runtime-state";
import type { TrayRuntimeActionContext } from "./tray-runtime-action-context";

type NavigationActions = Pick<
  TrayHostActionsValue,
  | "openTray"
  | "openNestedTray"
  | "closeActiveTray"
  | "requestCloseActiveTray"
  | "nextStep"
  | "previousStep"
  | "requestPageTransition"
>;

// navigation commands own stack changes and transition contract creation
export const createTrayRuntimeNavigationActions = ({
  getState,
  setState,
  getDependencies,
  allocateTransitionGeneration,
  transitions,
  setPendingPageTransition,
  justOpenedRef,
}: TrayRuntimeActionContext): NavigationActions => ({
  openTray: (id: string) => {
    const state = getState();
    justOpenedRef.current = true;
    markTrayOpenRequested(id);
    void getDependencies().dismissFocusedInputs(state.activeTrayId);

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
    const state = getState();
    justOpenedRef.current = true;
    markTrayOpenRequested(id);
    void getDependencies().dismissFocusedInputs(state.activeTrayId);

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
    const state = getState();
    void getDependencies().dismissFocusedInputs(state.activeTrayId);

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
    const state = getState();
    const activeStepOptions = resolveActiveStepOptions(state);
    const activeEntry = state.stack[state.stack.length - 1];
    const activeTray = activeEntry
      ? state.registry[activeEntry.trayId]
      : undefined;
    const safeIndex = clampTrayStepIndex(
      activeEntry?.index ?? 0,
      activeTray?.steps.length ?? 0,
    );

    if (
      activeStepOptions.fullScreen &&
      activeStepOptions.fullScreenCloseBehavior === "returnToShell" &&
      safeIndex > 0
    ) {
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

    void getDependencies().dismissFocusedInputs(state.activeTrayId);

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
    const state = getState();
    const activeEntry = state.stack[state.stack.length - 1];
    const activeTray = activeEntry
      ? state.registry[activeEntry.trayId]
      : undefined;
    const total = activeTray?.steps.length ?? 0;
    const nextIndex =
      total <= 0 ? 0 : Math.min((activeEntry?.index ?? 0) + 1, total - 1);

    setState((current) => {
      const activeStackIndex = current.stack.length - 1;
      const currentEntry = current.stack[activeStackIndex];

      if (!currentEntry || nextIndex === currentEntry.index) {
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
    const state = getState();
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
    const state = getState();
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

    setPendingPageTransition(contract);
    transitions.begin(contract);
    return generation;
  },
});
