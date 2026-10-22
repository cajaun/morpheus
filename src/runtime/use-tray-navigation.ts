import { useCallback, useMemo } from "react";
import { markTrayStepRequested } from "../telemetry/tray-step-timing";
import { clampTrayStepIndex } from "./tray-step-index";
import {
  useTrayHostActions,
  useTrayHostSelector,
  useTrayScope,
} from "./tray-store-context";

// connect the nearest tray to step navigation and presentation actions
export const useTrayNavigation = () => {
  const trayId = useTrayScope();
  // navigation state follows the nearest root so nested trays stay independent
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

    const parentEntry = state.stack.find(
      (entry) => entry.trayId === parentTrayId,
    );
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
  } = useTrayHostActions();

  if (!trayId) {
    throw new Error("Must be used within Tray.Root scope");
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
