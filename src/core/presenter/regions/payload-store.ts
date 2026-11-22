import type { PresentedTrayProps } from "../../../runtime/presenter/types";
import {
  areStepOptionsEquivalent,
  arePreloadedStepsEquivalent,
} from "../../../runtime/presenter/model";
import type { PresentedPreloadedStep } from "../../../runtime/presenter/types";

export const NO_PRELOADED_STEPS: readonly PresentedPreloadedStep[] = [];

export type PresentedTrayRegionName =
  "header" | "content" | "footer" | "stepFooter";

export type PresentedTrayPayloadStore = {
  getSnapshot: () => PresentedTrayProps["payload"];
  subscribe: (listener: () => void) => () => void;
  publish: (payload: PresentedTrayProps["payload"]) => void;
};

export type PresentedTrayRegionPayload = Pick<
  PresentedTrayProps["payload"],
  | "rootTrayId"
  | "trayId"
  | "stepOptions"
  | "header"
  | "content"
  | "footer"
  | "stepFooter"
  | "stepFooterKey"
  | "footerStyle"
  | "footerClassName"
  | "fullScreen"
  | "fullScreenBoundaryExit"
  | "isFirstRender"
  | "preloadCapable"
  | "preloadedSteps"
>;

export const createPresentedTrayPayloadStore = (
  initialPayload: PresentedTrayProps["payload"],
): PresentedTrayPayloadStore => {
  let currentPayload = initialPayload;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => currentPayload,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    publish: (payload) => {
      if (payload === currentPayload) {
        return;
      }

      currentPayload = payload;
      listeners.forEach((listener) => listener());
    },
  };
};

export const arePresentedTrayRegionPayloadsEquivalent = (
  region: PresentedTrayRegionName,
  previous: PresentedTrayRegionPayload,
  next: PresentedTrayRegionPayload,
) => {
  if (
    previous.rootTrayId !== next.rootTrayId ||
    previous.stepOptions === undefined ||
    !areStepOptionsEquivalent(previous.stepOptions, next.stepOptions)
  ) {
    return false;
  }

  if (region === "stepFooter") {
    return (
      previous.stepFooter === next.stepFooter &&
      previous.stepFooterKey === next.stepFooterKey &&
      previous.footerStyle === next.footerStyle &&
      previous.footerClassName === next.footerClassName &&
      previous.fullScreen === next.fullScreen &&
      previous.fullScreenBoundaryExit === next.fullScreenBoundaryExit &&
      previous.isFirstRender === next.isFirstRender
    );
  }

  if (region === "footer") {
    // a footer shared across steps reads the runtime store, so new step ids or bodies skip rebuilding its wrapper
    return previous.footer === next.footer;
  }

  return (
    previous.trayId === next.trayId &&
    previous.fullScreen === next.fullScreen &&
    previous.fullScreenBoundaryExit === next.fullScreenBoundaryExit &&
    previous.isFirstRender === next.isFirstRender &&
    (region === "header"
      ? previous.header === next.header
      : previous.content === next.content) &&
    (previous.preloadCapable ?? false) === (next.preloadCapable ?? false) &&
    arePreloadedStepsEquivalent(previous.preloadedSteps, next.preloadedSteps)
  );
};

// each region selects the fields it depends on and keeps the selection object when they are unchanged
export const createPresentedTrayRegionSelector = (
  region: PresentedTrayRegionName,
) => {
  let previousPayload: PresentedTrayRegionPayload | null = null;
  let previousSelection: PresentedTrayRegionPayload | null = null;

  return (payload: PresentedTrayProps["payload"]) => {
    const nextPayload: PresentedTrayRegionPayload = {
      rootTrayId: payload.rootTrayId,
      trayId: payload.trayId,
      stepOptions: payload.stepOptions,
      header: region === "header" ? payload.header : null,
      content: region === "content" ? payload.content : null,
      footer: region === "footer" ? payload.footer : null,
      stepFooter: region === "stepFooter" ? (payload.stepFooter ?? null) : null,
      stepFooterKey:
        region === "stepFooter" ? (payload.stepFooterKey ?? null) : null,
      footerStyle: region === "stepFooter" ? payload.footerStyle : undefined,
      footerClassName:
        region === "stepFooter" ? payload.footerClassName : undefined,
      fullScreen: payload.fullScreen,
      fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
      isFirstRender: payload.isFirstRender,
      preloadCapable:
        region === "footer" || region === "stepFooter"
          ? undefined
          : payload.preloadCapable,
      preloadedSteps:
        region === "footer" || region === "stepFooter"
          ? undefined
          : payload.preloadedSteps,
    };

    if (
      previousPayload !== null &&
      previousSelection !== null &&
      arePresentedTrayRegionPayloadsEquivalent(
        region,
        previousPayload,
        nextPayload,
      )
    ) {
      return previousSelection;
    }

    previousPayload = nextPayload;
    previousSelection = nextPayload;
    return nextPayload;
  };
};
