import { resolveTrayStepOptions } from "../tray-step-options";
import { clampTrayStepIndex } from "../tray-step-index";
import {
  createTrayTransitionContract,
  resolveTrayPresentationEndpoint,
} from "../transition-contract";
import type {
  TrayHostStateValue,
  TrayPresentationEndpoint,
  TraySharedRegionContract,
  TrayTransitionReason,
} from "../types";

export { clampTrayStepIndex } from "../tray-step-index";

// the empty state from the shared keyboard dependency
export const createInitialTrayHostState = (): TrayHostStateValue => ({
  registry: {},
  activeTrayId: null,
  activeIndex: 0,
  stack: [],
  transitionGeneration: 0,
  lastTransition: null,
});

// active tray fields from the top stack entry
export const withActiveTrayFromStack = (
  state: TrayHostStateValue,
): TrayHostStateValue => {
  const activeEntry = state.stack[state.stack.length - 1];

  return {
    ...state,
    activeTrayId: activeEntry?.trayId ?? null,
    activeIndex: activeEntry?.index ?? 0,
  };
};

// the presentation endpoint of the active stack entry
export const resolveActiveTrayEndpoint = (
  state: TrayHostStateValue,
) => {
  const entry = state.stack[state.stack.length - 1];

  return resolveTrayPresentationEndpoint({
    entry,
    registration: entry ? state.registry[entry.trayId] : undefined,
  });
};

// presentation mode and options from one registered endpoint
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

// shell regions that persist across the transition
export const resolveSharedRegions = (
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
      sourceId:
        sourceHeader && from
          ? `${from.trayId}:${from.stepKey}:header`
          : undefined,
      targetId:
        targetHeader && to
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

// attach one generation and endpoint pair to the next navigation state
export const withTrayTransition = (
  current: TrayHostStateValue,
  next: TrayHostStateValue,
  reason: TrayTransitionReason,
  generation: number,
): TrayHostStateValue => {
  const from = resolveActiveTrayEndpoint(current);
  const to = resolveActiveTrayEndpoint(next);

  return {
    ...next,
    transitionGeneration: generation,
    lastTransition: createTrayTransitionContract({
      generation,
      reason,
      from,
      to,
      sharedRegions: resolveSharedRegions(current, next, from, to),
    }),
  };
};

// repair a provisional transition when registration reveals the final step data
export const reconcileTransitionAfterRegistration = (
  current: TrayHostStateValue,
  next: TrayHostStateValue,
  trayId: string,
  activeGeneration: number | null,
): TrayHostStateValue => {
  const existingTransition = current.lastTransition;
  const activeEntry = next.stack[next.stack.length - 1];

  if (
    !existingTransition ||
    existingTransition.generation !== activeGeneration ||
    !activeEntry ||
    activeEntry.trayId !== trayId ||
    existingTransition.to?.trayId !== trayId ||
    existingTransition.to.stepIndex !== activeEntry.index
  ) {
    return next;
  }

  const nextTarget = resolveActiveTrayEndpoint(next);

  if (!nextTarget) {
    return next;
  }

  const targetChanged =
    existingTransition.to.stepKey !== nextTarget.stepKey ||
    existingTransition.to.mode !== nextTarget.mode ||
    existingTransition.to.pageIndex !== nextTarget.pageIndex ||
    existingTransition.to.keyboardAware !== nextTarget.keyboardAware;

  if (!targetChanged) {
    return next;
  }

  // registration can settle after navigation, so repair the target in place
  return {
    ...next,
    lastTransition: createTrayTransitionContract({
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

// clamp active indexes after registration changes the available steps
export const clampTrayRuntimeState = (
  state: TrayHostStateValue,
): TrayHostStateValue => {
  if (state.stack.length === 0) {
    return withActiveTrayFromStack(state);
  }

  const nextStack = state.stack
    .filter((entry) => state.registry[entry.trayId])
    .map((entry) => {
      const tray = state.registry[entry.trayId];

      return {
        ...entry,
        index: clampTrayStepIndex(entry.index, tray?.steps.length ?? 0),
      };
    });

  const stackChanged =
    nextStack.length !== state.stack.length ||
    nextStack.some((entry, index) => {
      const previous = state.stack[index];

      return (
        previous?.trayId !== entry.trayId ||
        previous?.index !== entry.index ||
        previous?.parentTrayId !== entry.parentTrayId
      );
    });

  if (!stackChanged) {
    const activeEntry = state.stack[state.stack.length - 1];

    if (
      state.activeTrayId === (activeEntry?.trayId ?? null) &&
      state.activeIndex === (activeEntry?.index ?? 0)
    ) {
      return state;
    }

    return withActiveTrayFromStack(state);
  }

  return withActiveTrayFromStack({
    ...state,
    stack: nextStack,
  });
};

// normalized options of the active registered step
export const resolveActiveStepOptions = (
  state: TrayHostStateValue,
) => {
  if (!state.activeTrayId) {
    return resolveTrayStepOptions();
  }

  const activeTray = state.registry[state.activeTrayId];
  const safeIndex = clampTrayStepIndex(
    state.activeIndex,
    activeTray?.steps.length ?? 0,
  );
  const activeStep = activeTray?.steps[safeIndex];

  return resolveTrayStepOptions(activeStep?.options);
};
