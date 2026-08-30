import { resolveTrayStepOptions } from "./tray-step-options";
import { clampTrayStepIndex } from "./tray-step-index";
import type {
  TrayPresentationEndpoint,
  TrayRegistration,
  TrayStackEntry,
  TrayTransitionBoundary,
  TrayTransitionContract,
  TrayTransitionDirection,
  TrayTransitionReason,
  TraySharedRegionContract,
} from "./types";

// derive an endpoint from stack identity and registered step data
export const resolveTrayPresentationEndpoint = ({
  entry,
  registration,
}: {
  entry: TrayStackEntry | undefined;
  registration: TrayRegistration | undefined;
}): TrayPresentationEndpoint | null => {
  if (!entry || !registration) {
    return null;
  }

  const stepIndex = clampTrayStepIndex(entry.index, registration.steps.length);
  const step = registration.steps[stepIndex];

  if (!step) {
    return null;
  }

  const pages = registration.pages;
  const pageIndex = pages?.stepKey === step.key ? pages.pageIndex : undefined;

  return {
    trayId: entry.trayId,
    stepIndex,
    stepKey: step.key,
    pageIndex,
    mode: resolveTrayStepOptions(step.options).fullScreen
      ? "fullScreen"
      : "sheet",
  };
};

// derive forward or backward motion from the step indexes
const resolveDirection = (
  reason: TrayTransitionReason,
  from: TrayPresentationEndpoint | null,
  to: TrayPresentationEndpoint | null,
): TrayTransitionDirection => {
  if (reason === "nextStep") {
    return "forward";
  }

  if (reason === "previousStep" || reason === "returnToShell") {
    return "backward";
  }

  if (
    reason === "pageChange" &&
    from !== null &&
    to !== null &&
    from.trayId === to.trayId &&
    from.stepKey === to.stepKey &&
    from.pageIndex !== undefined &&
    to.pageIndex !== undefined
  ) {
    return to.pageIndex > from.pageIndex ? "forward" : "backward";
  }

  return "none";
};

// classify the transition by source and target presentation modes
const resolveBoundary = (
  reason: TrayTransitionReason,
  from: TrayPresentationEndpoint | null,
  to: TrayPresentationEndpoint | null,
): TrayTransitionBoundary => {
  if (!from) {
    return "opening";
  }

  if (!to) {
    return "closing";
  }

  // nested/root entries are separate host surfaces their mode values must not be interpreted as one shell morphing between sheet and fullscreen
  if (from.trayId !== to.trayId) {
    return reason === "closeNested" ? "closing" : "opening";
  }

  if (from.mode === "sheet" && to.mode === "fullScreen") {
    return "sheetToFullScreen";
  }

  if (from.mode === "fullScreen" && to.mode === "sheet") {
    return "fullScreenToSheet";
  }

  return from.mode === "fullScreen"
    ? "fullScreenToFullScreen"
    : "sheetToSheet";
};

// build the immutable identity and shared region plan for a transition
export const createTrayTransitionContract = ({
  generation,
  reason,
  from,
  to,
  sharedRegions,
}: {
  generation: number;
  reason: TrayTransitionReason;
  from: TrayPresentationEndpoint | null;
  to: TrayPresentationEndpoint | null;
  sharedRegions?: readonly TraySharedRegionContract[];
}): TrayTransitionContract => ({
  generation,
  reason,
  direction: resolveDirection(reason, from, to),
  boundary: resolveBoundary(reason, from, to),
  from,
  to,
  stepChanged:
    from?.trayId !== to?.trayId || from?.stepKey !== to?.stepKey,
  pageChanged:
    from?.trayId === to?.trayId &&
    from?.stepKey === to?.stepKey &&
    from?.pageIndex !== to?.pageIndex,
  fullScreenChanged:
    from !== null &&
    to !== null &&
    from.trayId === to.trayId &&
    from.mode !== to.mode,
  sharedRegions:
    sharedRegions ??
    [
      {
        region: "surface",
        behavior:
          from !== null && to !== null && from.trayId === to.trayId
            ? "persistent"
            : "replace",
        sourceId: from ? `${from.trayId}:surface` : undefined,
        targetId: to ? `${to.trayId}:surface` : undefined,
      },
      {
        region: "header",
        behavior:
          from !== null && to !== null ? "keyedOverlap" : "replace",
        sourceId: from ? `${from.trayId}:${from.stepKey}:header` : undefined,
        targetId: to ? `${to.trayId}:${to.stepKey}:header` : undefined,
      },
      {
        region: "body",
        behavior: "replace",
        sourceId: from ? `${from.trayId}:${from.stepKey}:body` : undefined,
        targetId: to ? `${to.trayId}:${to.stepKey}:body` : undefined,
      },
      {
        region: "footer",
        behavior:
          from !== null && to !== null && from.trayId === to.trayId
            ? "persistent"
            : "replace",
        sourceId: from ? `${from.trayId}:footer` : undefined,
        targetId: to ? `${to.trayId}:footer` : undefined,
      },
    ],
});
