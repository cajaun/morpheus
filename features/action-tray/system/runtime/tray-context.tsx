import React, {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import { markTrayStepRequested } from "../telemetry/tray-step-timing";
import {
  DEFAULT_TRAY_STEP_OPTIONS,
  resolveTrayStepOptions,
} from "./tray-step-options";
import type {
  ResolvedTrayStepOptions,
  TrayHostStateValue,
  TrayRuntimeStore,
} from "./types";

export {
  DEFAULT_TRAY_STEP_OPTIONS,
  resolveTrayStepOptions,
} from "./tray-step-options";
export type {
  ResolvedTrayStepOptions,
  TrayCloseTransition,
  TrayFullScreenCloseBehavior,
  TrayFullScreenTransition,
  TrayHostActionsValue,
  TrayHostStateValue,
  TrayOpenTransition,
  TrayPagesRegistration,
  TrayRegistration,
  TrayRuntimeStore,
  TrayStackEntry,
  TrayStepDefinition,
  TrayStepOptions,
  TrayTransitionOptions,
} from "./types";

const TrayStoreContext = createContext<TrayRuntimeStore | null>(null);
const TrayScopeContext = createContext<string | null>(null);
const TrayStepOptionsContext =
  createContext<ResolvedTrayStepOptions>(DEFAULT_TRAY_STEP_OPTIONS);

export const TrayStoreProvider = TrayStoreContext.Provider;
export const TrayScopeProvider = TrayScopeContext.Provider;
export const TrayStepOptionsProvider = TrayStepOptionsContext.Provider;

export const useTrayRuntimeStore = () => {
  const ctx = useContext(TrayStoreContext);

  if (!ctx) {
    throw new Error("Must be used within TrayProvider");
  }

  return ctx;
};

export const useTrayHostSelector = <T,>(
  selector: (state: TrayHostStateValue) => T,
) => {
  const store = useTrayRuntimeStore();
  // selectors avoid rerendering every tray consumer on unrelated store changes
  const getSnapshot = useCallback(
    () => selector(store.getState()),
    [selector, store],
  );

  return useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    getSnapshot,
  );
};

export const useTrayHostState = () => useTrayHostSelector((state) => state);

export const useTrayHostActions = () => {
  return useTrayRuntimeStore().actions;
};

export const useTrayHost = () => {
  const state = useTrayHostState();
  const actions = useTrayHostActions();

  // this merged hook is mostly for tests tooling and low level integrations
  return {
    ...state,
    ...actions,
  };
};

export const useTrayScope = () => useContext(TrayScopeContext);

export const useTrayStepOptions = () => useContext(TrayStepOptionsContext);

const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

export const useTrayFlow = () => {
  const trayId = useTrayScope();
  // flow state is scoped to the nearest root so nested trays do not collide
  const registration = useTrayHostSelector((state) =>
    trayId ? state.registry[trayId] : undefined,
  );
  const activeTrayId = useTrayHostSelector((state) => state.activeTrayId);
  const stackEntry = useTrayHostSelector((state) =>
    trayId ? state.stack.find((entry) => entry.trayId === trayId) : undefined,
  );
  const parentPageControls = useTrayHostSelector((state) => {
    const parentTrayId = stackEntry?.parentTrayId;

    if (!parentTrayId) {
      return null;
    }

    // nested trays can close and advance parent pages only when the parent page footer is absent
    const parentEntry = state.stack.find((entry) => entry.trayId === parentTrayId);
    const parentRegistration = state.registry[parentTrayId];
    const parentStep = parentRegistration?.steps[parentEntry?.index ?? 0];
    const pages = parentRegistration?.pages;

    if (!parentStep || pages?.stepKey !== parentStep.key || pages.hasFooter) {
      return null;
    }

    return pages;
  });
  const {
    openTray,
    closeActiveTray,
    requestCloseActiveTray,
    nextStep,
    previousStep,
    anticipateKeyboard,
    dismissKeyboardForTray,
  } = useTrayHostActions();

  if (!trayId) {
    throw new Error("Must be used within Tray.Root scope");
  }

  const total = registration?.steps.length ?? 0;
  const isActive = activeTrayId === trayId;
  const index = stackEntry ? clampIndex(stackEntry.index, total) : 0;
  const activeStep = registration?.steps[index];
  const pageControls =
    activeStep &&
    registration?.pages?.stepKey === activeStep.key &&
    !registration.pages.hasFooter
      ? registration.pages
      : null;
  // page controls take priority so page flows can move without changing tray shell steps
  const canGoNext = pageControls ? pageControls.canGoNext : index < total - 1;
  const canGoBack = pageControls ? pageControls.canGoBack : index > 0;

  return {
    trayId,
    isActive,
    index,
    total,
    canGoNext,
    canGoBack,
    pageIndex: pageControls?.pageIndex,
    open: () => openTray(trayId),
    close: () => {
      if (isActive) {
        closeActiveTray();
      }
    },
    closeAndNextParentPage: () => {
      if (isActive) {
        closeActiveTray();
        parentPageControls?.nextPage();
      }
    },
    requestClose: () => {
      if (isActive) {
        if (
          activeStep?.options?.fullScreen &&
          activeStep.options.fullScreenCloseBehavior === "returnToShell" &&
          index > 0
        ) {
          const previousStepDefinition = registration?.steps[index - 1];

          if (previousStepDefinition) {
            // returning from fullscreen is a step transition for timing diagnostics
            markTrayStepRequested(trayId);
          }
        }

        requestCloseActiveTray();
      }
    },
    next: () => {
      if (isActive) {
        if (pageControls?.canGoNext) {
          // pages move inside the current step so the runtime index stays stable
          pageControls.nextPage();
          return;
        }

        const nextIndex = clampIndex(index + 1, total);
        const nextStepDefinition = registration?.steps[nextIndex];

        if (nextIndex !== index && nextStepDefinition) {
          markTrayStepRequested(trayId);
        }

        nextStep();
      }
    },
    back: () => {
      if (isActive) {
        if (pageControls?.canGoBack) {
          // page back mirrors next by avoiding a shell step transition
          pageControls.backPage();
          return;
        }

        const previousIndex = clampIndex(index - 1, total);
        const previousStepDefinition = registration?.steps[previousIndex];

        if (previousIndex !== index && previousStepDefinition) {
          markTrayStepRequested(trayId);
        }

        previousStep();
      }
    },
    anticipateKeyboard,
    dismissKeyboard: () => dismissKeyboardForTray(trayId),
  };
};
