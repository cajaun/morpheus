import { markTrayStepRequested } from "../telemetry/tray-step-timing";
import { clampTrayStepIndex } from "./tray-step-index";
import {
  useTrayHostActions,
  useTrayHostSelector,
  useTrayScope,
} from "./tray-store-context";

export const useTrayFlow = () => {
  const trayId = useTrayScope();
  // flow state follows the nearest root so nested trays keep independent navigation
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
    anticipateKeyboard,
    dismissKeyboardForTray,
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
          markTrayStepRequested(trayId);
        }

        requestCloseActiveTray();
      }
    },
    next: () => {
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
    },
    back: () => {
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
    },
    anticipateKeyboard,
    dismissKeyboard: () => dismissKeyboardForTray(trayId),
  };
};
