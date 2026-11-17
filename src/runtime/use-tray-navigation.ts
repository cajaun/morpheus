import { useCallback, useMemo, useRef } from "react";
import { markTrayStepRequested } from "../telemetry/tray-step-timing";
import { clampTrayStepIndex } from "./tray-step-index";
import {
  useTrayHostSelector,
  useTrayRuntimeStore,
  useTrayScope,
} from "./tray-store-context";
import type {
  TrayHostStateValue,
  TrayPagesRegistration,
  TrayRegistration,
  TrayStackEntry,
} from "./types";

type TrayNavigationSnapshot = {
  registration: TrayRegistration | undefined;
  activeTrayId: string | null;
  stackEntry: TrayStackEntry | undefined;
  parentPageControls: TrayPagesRegistration | null;
  total: number;
  isActive: boolean;
  index: number;
  activeStep: TrayRegistration["steps"][number] | undefined;
  pageControls: TrayPagesRegistration | null;
};

// A navigation consumer needs one coherent view of the runtime state. Keep
// that view referentially stable when an unrelated runtime write changes the
// store object but not the fields navigation actually renders. This prevents
// one footer from maintaining several subscriptions and scheduling several
// selector calculations for the same step transition.
const areTrayNavigationSnapshotsEquivalent = (
  previous: TrayNavigationSnapshot,
  next: TrayNavigationSnapshot,
) =>
  previous.registration === next.registration &&
  previous.activeTrayId === next.activeTrayId &&
  previous.parentPageControls === next.parentPageControls &&
  previous.total === next.total &&
  previous.isActive === next.isActive &&
  previous.index === next.index &&
  previous.activeStep === next.activeStep &&
  previous.pageControls === next.pageControls;

const createTrayNavigationSelector = (trayId: string) => {
  let previousState: TrayHostStateValue | null = null;
  let previousSnapshot: TrayNavigationSnapshot | null = null;

  return (state: TrayHostStateValue) => {
    if (state === previousState && previousSnapshot !== null) {
      return previousSnapshot;
    }

    const nextSnapshot = resolveTrayNavigationSnapshot(state, trayId);

    if (
      previousSnapshot !== null &&
      areTrayNavigationSnapshotsEquivalent(previousSnapshot, nextSnapshot)
    ) {
      previousState = state;
      return previousSnapshot;
    }

    previousState = state;
    previousSnapshot = nextSnapshot;
    return nextSnapshot;
  };
};

// Resolve command state imperatively for action-only consumers. These
// consumers intentionally do not subscribe to the store; commands read the
// current snapshot at press time so a stable callback never captures stale
// step state.
const resolveTrayNavigationSnapshot = (
  state: TrayHostStateValue,
  trayId: string,
): TrayNavigationSnapshot => {
  const registration = state.registry[trayId];
  const activeTrayId = state.activeTrayId;
  const stackEntry = state.stack.find((entry) => entry.trayId === trayId);
  const parentTrayId = stackEntry?.parentTrayId;
  let parentPageControls: TrayPagesRegistration | null = null;

  if (parentTrayId) {
    const parentEntry = state.stack.find(
      (entry) => entry.trayId === parentTrayId,
    );
    const parentRegistration = state.registry[parentTrayId];
    const parentStep = parentRegistration?.steps[parentEntry?.index ?? 0];
    const pages = parentRegistration?.pages;

    if (
      parentStep &&
      pages?.stepKey === parentStep.key &&
      !pages.hasFooter
    ) {
      parentPageControls = pages;
    }
  }

  const total = registration?.steps.length ?? 0;
  const isActive = activeTrayId === trayId;
  const index = stackEntry
    ? clampTrayStepIndex(stackEntry.index, total)
    : 0;
  const activeStep = registration?.steps[index];
  const pageControls =
    activeStep &&
    registration?.pages?.stepKey === activeStep.key &&
    !registration.pages.hasFooter
      ? registration.pages
      : null;

  return {
    registration,
    activeTrayId,
    stackEntry,
    parentPageControls,
    total,
    isActive,
    index,
    activeStep,
    pageControls,
  };
};

export type TrayNavigationState = {
  trayId: string;
  isActive: boolean;
  index: number;
  total: number;
  canGoNext: boolean;
  canGoBack: boolean;
  pageIndex: number | undefined;
};

const toTrayNavigationState = (
  trayId: string,
  snapshot: TrayNavigationSnapshot,
): TrayNavigationState => {
  const { pageControls, index, total, isActive } = snapshot;

  return {
    trayId,
    isActive,
    index,
    total,
    // page controls take priority so page navigation keeps the shell step stable
    canGoNext: pageControls ? pageControls.canGoNext : index < total - 1,
    canGoBack: pageControls ? pageControls.canGoBack : index > 0,
    pageIndex: pageControls?.pageIndex,
  };
};

const areTrayNavigationStatesEqual = (
  previous: TrayNavigationState,
  next: TrayNavigationState,
) =>
  previous.trayId === next.trayId &&
  previous.isActive === next.isActive &&
  previous.index === next.index &&
  previous.total === next.total &&
  previous.canGoNext === next.canGoNext &&
  previous.canGoBack === next.canGoBack &&
  previous.pageIndex === next.pageIndex;

const selectWholeNavigationState = (state: TrayNavigationState) => state;

// Subscribe to navigation state for components that render it (step counters,
// pagers, footers that hide on the last step). Pass a selector to re-render
// only when that slice changes:
//
//   const index = useTrayNavigationState((state) => state.index);
//
// Components that only trigger navigation should use useTrayNavigation(),
// which subscribes to nothing.
export function useTrayNavigationState(): TrayNavigationState;
export function useTrayNavigationState<T>(
  selector: (state: TrayNavigationState) => T,
  isEqual?: (previous: T, next: T) => boolean,
): T;
export function useTrayNavigationState<T>(
  selector?: (state: TrayNavigationState) => T,
  isEqual?: (previous: T, next: T) => boolean,
) {
  const trayId = useTrayScope();

  if (!trayId) {
    throw new Error("Must be used within Tray.Root scope");
  }

  // Keep the latest selector without changing the store selector identity, so
  // an inline selector does not reset the cached result on every render.
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const storeSelector = useMemo(() => {
    const selectNavigation = createTrayNavigationSelector(trayId);
    let previousSnapshot: TrayNavigationSnapshot | null = null;
    let previousState: TrayNavigationState | null = null;
    let hasOutput = false;
    let previousOutput: unknown;

    return (state: TrayHostStateValue) => {
      const snapshot = selectNavigation(state);

      if (snapshot !== previousSnapshot || previousState === null) {
        const nextState = toTrayNavigationState(trayId, snapshot);

        previousState =
          previousState !== null &&
          areTrayNavigationStatesEqual(previousState, nextState)
            ? previousState
            : nextState;
        previousSnapshot = snapshot;
      }

      const select = (selectorRef.current ??
        selectWholeNavigationState) as (value: TrayNavigationState) => unknown;
      const output = select(previousState);
      const equal = (isEqualRef.current ?? Object.is) as (
        a: unknown,
        b: unknown,
      ) => boolean;

      if (hasOutput && equal(previousOutput, output)) {
        return previousOutput;
      }

      hasOutput = true;
      previousOutput = output;
      return output;
    };
  }, [trayId]);

  return useTrayHostSelector(storeSelector) as T | TrayNavigationState;
}

// Navigation commands for the nearest tray. This hook subscribes to no
// navigation state, so pressing next/back never re-renders the step that is
// being left. Commands read the current runtime snapshot at press time, so
// their identities stay stable and never capture stale step state. Read state
// with useTrayNavigationState(selector) when a component renders it.
export const useTrayNavigation = () => {
  const trayId = useTrayScope();
  const store = useTrayRuntimeStore();
  const {
    openTray,
    closeActiveTray,
    requestCloseActiveTray,
    nextStep,
    previousStep,
  } = store.actions;

  if (!trayId) {
    throw new Error("Must be used within Tray.Root scope");
  }

  const open = useCallback(() => openTray(trayId), [openTray, trayId]);
  const close = useCallback(() => {
    const snapshot = resolveTrayNavigationSnapshot(store.getState(), trayId);

    if (snapshot.isActive) {
      closeActiveTray();
    }
  }, [closeActiveTray, store, trayId]);
  const closeAndNextParentPage = useCallback(() => {
    const snapshot = resolveTrayNavigationSnapshot(store.getState(), trayId);

    if (snapshot.isActive) {
      closeActiveTray();
      snapshot.parentPageControls?.nextPage();
    }
  }, [closeActiveTray, store, trayId]);
  const requestClose = useCallback(() => {
    const snapshot = resolveTrayNavigationSnapshot(store.getState(), trayId);

    if (!snapshot.isActive) {
      return;
    }

    if (
      snapshot.activeStep?.options?.fullScreen &&
      snapshot.activeStep.options.fullScreenCloseBehavior === "returnToShell" &&
      snapshot.index > 0
    ) {
      markTrayStepRequested(trayId);
    }

    requestCloseActiveTray();
  }, [requestCloseActiveTray, store, trayId]);
  const next = useCallback(() => {
    const snapshot = resolveTrayNavigationSnapshot(store.getState(), trayId);

    if (!snapshot.isActive) {
      return;
    }

    if (snapshot.pageControls?.canGoNext) {
      snapshot.pageControls.nextPage();
      return;
    }

    const nextIndex = clampTrayStepIndex(snapshot.index + 1, snapshot.total);
    const nextStepDefinition = snapshot.registration?.steps[nextIndex];

    if (nextIndex !== snapshot.index && nextStepDefinition) {
      markTrayStepRequested(trayId);
    }

    nextStep();
  }, [nextStep, store, trayId]);
  const back = useCallback(() => {
    const snapshot = resolveTrayNavigationSnapshot(store.getState(), trayId);

    if (!snapshot.isActive) {
      return;
    }

    if (snapshot.pageControls?.canGoBack) {
      snapshot.pageControls.backPage();
      return;
    }

    const previousIndex = clampTrayStepIndex(
      snapshot.index - 1,
      snapshot.total,
    );
    const previousStepDefinition = snapshot.registration?.steps[previousIndex];

    if (previousIndex !== snapshot.index && previousStepDefinition) {
      markTrayStepRequested(trayId);
    }

    previousStep();
  }, [previousStep, store, trayId]);

  return useMemo(
    () => ({
      trayId,
      open,
      close,
      closeAndNextParentPage,
      requestClose,
      next,
      back,
    }),
    [
      back,
      close,
      closeAndNextParentPage,
      next,
      open,
      requestClose,
      trayId,
    ],
  );
};

// @deprecated since 3.0.0 — useTrayNavigation is now actions-only; use it directly.
export const useTrayNavigationActions = useTrayNavigation;
