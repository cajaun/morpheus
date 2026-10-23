import { useCallback, useMemo } from "react";
import { markTrayStepRequested } from "../telemetry/tray-step-timing";
import { clampTrayStepIndex } from "./tray-step-index";
import {
  useTrayHostActions,
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

// connect the nearest tray to step navigation and presentation actions
export const useTrayNavigation = () => {
  const trayId = useTrayScope();
  // navigation state follows the nearest root so nested trays stay
  // independent. One cached selector gives the footer one coherent snapshot
  // and avoids four independent store subscriptions for the same transition.
  const navigationSelector = useMemo(
    () => createTrayNavigationSelector(trayId ?? ""),
    [trayId],
  );
  const navigation = useTrayHostSelector(navigationSelector);
  const {
    openTray,
    closeActiveTray,
    requestCloseActiveTray,
    nextStep,
    previousStep,
  } = useTrayHostActions();

  if (!trayId) {
    throw new Error("Must be used within Tray.Root scope");
  }

  const {
    registration,
    parentPageControls,
    total,
    isActive,
    index,
    activeStep,
    pageControls,
  } = navigation;
  // page controls take priority so page navigation keeps the shell step stable
  const canGoNext = pageControls ? pageControls.canGoNext : index < total - 1;
  const canGoBack = pageControls ? pageControls.canGoBack : index > 0;

  // Keep command identities stable between equivalent store snapshots. This
  // prevents navigation consumers from propagating fresh callback props into
  // their button subtrees when only unrelated tray state changes.
  const open = useCallback(() => openTray(trayId), [openTray, trayId]);
  const close = useCallback(() => {
    if (isActive) {
      closeActiveTray();
    }
  }, [closeActiveTray, isActive]);
  const closeAndNextParentPage = useCallback(() => {
    if (isActive) {
      closeActiveTray();
      parentPageControls?.nextPage();
    }
  }, [closeActiveTray, isActive, parentPageControls]);
  const requestClose = useCallback(() => {
    if (isActive) {
      if (
        activeStep?.options?.fullScreen &&
        activeStep.options.fullScreenCloseBehavior === "returnToShell" &&
        index > 0
      ) {
        markTrayStepRequested(trayId);
      }

      requestCloseActiveTray();
    }
  }, [
    activeStep?.options?.fullScreen,
    activeStep?.options?.fullScreenCloseBehavior,
    index,
    isActive,
    requestCloseActiveTray,
    trayId,
  ]);
  const next = useCallback(() => {
    if (isActive) {
      if (pageControls?.canGoNext) {
        pageControls.nextPage();
        return;
      }

      const nextIndex = clampTrayStepIndex(index + 1, total);
      const nextStepDefinition = registration?.steps[nextIndex];

      if (nextIndex !== index && nextStepDefinition) {
        markTrayStepRequested(trayId);
      }

      nextStep();
    }
  }, [
    index,
    isActive,
    nextStep,
    pageControls,
    registration?.steps,
    total,
    trayId,
  ]);
  const back = useCallback(() => {
    if (isActive) {
      if (pageControls?.canGoBack) {
        pageControls.backPage();
        return;
      }

      const previousIndex = clampTrayStepIndex(index - 1, total);
      const previousStepDefinition = registration?.steps[previousIndex];

      if (previousIndex !== index && previousStepDefinition) {
        markTrayStepRequested(trayId);
      }

      previousStep();
    }
  }, [
    index,
    isActive,
    pageControls,
    previousStep,
    registration?.steps,
    total,
    trayId,
  ]);

  return useMemo(
    () => ({
      trayId,
      isActive,
      index,
      total,
      canGoNext,
      canGoBack,
      pageIndex: pageControls?.pageIndex,
      open,
      close,
      closeAndNextParentPage,
      requestClose,
      next,
      back,
    }),
    [
      back,
      canGoBack,
      canGoNext,
      close,
      closeAndNextParentPage,
      index,
      isActive,
      next,
      open,
      pageControls?.pageIndex,
      requestClose,
      total,
      trayId,
    ],
  );
};

// Expose stable imperative navigation commands for controls that do not need
// navigation state in their render output. Unlike useTrayNavigation, this hook
// subscribes to no state slices, so a header close button cannot be forced to
// reconcile when the footer index or another step changes.
export const useTrayNavigationActions = () => {
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
