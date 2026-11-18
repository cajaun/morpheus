import {
  DEFAULT_TRAY_STEP_OPTIONS,
  resolveTrayStepOptions,
  type ResolvedTrayStepOptions,
  type TrayRegistration,
  type TrayStackEntry,
  type TrayTransitionContract,
} from "../tray-context";
import { resolveTrayPresentationEndpoint } from "../transition-contract";
import { clampTrayStepIndex } from "../tray-step-index";
import { resolveTrayAnimationContract } from "./animation-contract";
import type { TrayStepDefinition } from "../types";
import type {
  PresentedPreloadedStep,
  PresentedTray,
  TrayHostSlot,
} from "./types";

type ContextualStepOptionsCache = {
  withFooter?: ResolvedTrayStepOptions;
  withoutFooter?: ResolvedTrayStepOptions;
};

// Registered step definitions are immutable runtime descriptors. Cache the
// resolved options by descriptor so presenter derivation does not allocate a
// fresh options object on every unrelated store notification.
const contextualStepOptionsCache = new WeakMap<
  TrayStepDefinition,
  ContextualStepOptionsCache
>();

const resolveContextualStepOptions = (
  step: TrayStepDefinition,
  hasFooter: boolean,
): ResolvedTrayStepOptions => {
  const cached = contextualStepOptionsCache.get(step) ?? {};
  const cachedOptions = hasFooter ? cached.withFooter : cached.withoutFooter;

  if (cachedOptions !== undefined) {
    return cachedOptions;
  }

  const resolvedOptions = resolveTrayStepOptions(step.options);

  if (resolvedOptions.hasFooter === hasFooter) {
    if (hasFooter) {
      cached.withFooter = resolvedOptions;
    } else {
      cached.withoutFooter = resolvedOptions;
    }

    contextualStepOptionsCache.set(step, cached);

    return resolvedOptions;
  }

  const contextualOptions = {
    ...resolvedOptions,
    hasFooter,
  };

  if (hasFooter) {
    cached.withFooter = contextualOptions;
  } else {
    cached.withoutFooter = contextualOptions;
  }

  contextualStepOptionsCache.set(step, cached);

  return contextualOptions;
};

// convert registered tray state into the payload consumed by host slots
// create an empty host slot that cannot receive input or render content
export const createIdleSlot = (): TrayHostSlot => ({
  assignmentId: 0,
  payload: null,
  visible: false,
  interactive: false,
  prepared: false,
});

const PREPARED_ROOT_HOST_ID = "__morpheus_prepared_root_host__";
// The root host is pre-mounted and reused for different registrations. Keep
// both motion paths ready so a root presentation never mounts them on demand.
const ROOT_TRAY_MOTION_CAPABILITIES = {
  keyboardStickyCapable: true,
  fullScreenMotionCapable: true,
} as const;

type TrayMotionCapabilities = {
  keyboardStickyCapable: boolean;
  fullScreenMotionCapable: boolean;
};

const trayMotionCapabilitiesBySteps = new WeakMap<
  TrayRegistration["steps"],
  TrayMotionCapabilities
>();

const getTrayMotionCapabilities = (
  registration: TrayRegistration,
): TrayMotionCapabilities => {
  const cached = trayMotionCapabilitiesBySteps.get(registration.steps);

  if (cached !== undefined) {
    return cached;
  }

  // Step descriptors are fixed for a registration. Scan the full set so a
  // transition never changes the motion component tree midway through a tray.
  const capabilities = {
    keyboardStickyCapable: registration.steps.some(
      (step) => step.options?.keyboardAware === true,
    ),
    fullScreenMotionCapable: registration.steps.some(
      (step) => step.options?.fullScreen === true,
    ),
  };

  trayMotionCapabilitiesBySteps.set(registration.steps, capabilities);
  return capabilities;
};

const NO_PRELOADED_STEPS: readonly PresentedPreloadedStep[] = [];

const preloadCapableBySteps = new WeakMap<TrayRegistration["steps"], boolean>();

// Fixed per registration, like the motion capabilities: a tray in which any
// step can be preloaded (any sheet step after the first that has not opted
// out) always renders its content as keyed layers, so a transition never
// switches the content tree's shape midway. Single-step trays are unchanged.
const isPreloadCapable = (registration: TrayRegistration) => {
  const cached = preloadCapableBySteps.get(registration.steps);

  if (cached !== undefined) {
    return cached;
  }

  const capable = registration.steps.some(
    (step, index) =>
      index > 0 &&
      step.options?.preload !== false &&
      step.options?.fullScreen !== true,
  );
  preloadCapableBySteps.set(registration.steps, capable);
  return capable;
};

// The next step is kept rendered, hidden, unless it opts out or either step is
// fullscreen (fullscreen content uses the boundary transition's own layers).
const resolvePreloadedSteps = (
  rootTrayId: string,
  registration: TrayRegistration,
  trayIndex: number,
  currentOptions: ResolvedTrayStepOptions,
): readonly PresentedPreloadedStep[] => {
  const nextStep = registration.steps[trayIndex + 1];

  if (
    !nextStep ||
    nextStep.options?.preload === false ||
    currentOptions.fullScreen
  ) {
    return NO_PRELOADED_STEPS;
  }

  const nextOptions = resolveContextualStepOptions(
    nextStep,
    registration.footer != null,
  );

  if (nextOptions.fullScreen) {
    return NO_PRELOADED_STEPS;
  }

  return [
    {
      trayId: `${rootTrayId}-${nextStep.key}`,
      content: nextStep.content,
      stepOptions: nextOptions,
    },
  ];
};

// Keep one root controller mounted before the first presentation. The payload
// is intentionally inert: no content, no interaction, and no transition.
// The real tray payload replaces it without changing the host assignment key.
export const createPreparedRootSlot = (
  assignmentId = 1,
): TrayHostSlot => ({
  assignmentId,
  payload: {
    rootTrayId: PREPARED_ROOT_HOST_ID,
    trayId: `${PREPARED_ROOT_HOST_ID}-step`,
    stepOptions: DEFAULT_TRAY_STEP_OPTIONS,
    header: null,
    content: null,
    footer: null,
    fullScreenBoundaryExit: false,
    isFirstRender: true,
    fullScreen: false,
    fullScreenBackgroundScale: 1,
    fullScreenSafeAreaTop: false,
    fullScreenDraggable: true,
    ...ROOT_TRAY_MOTION_CAPABILITIES,
    dismissible: false,
    transitionContract: null,
    transition: undefined,
    stackIndex: 0,
    visible: false,
    interactive: false,
  },
  visible: false,
  interactive: false,
  prepared: true,
});

// Presenter state is derived from the runtime store. Preserve existing
// objects when the derived payload is semantically unchanged so an unrelated
// store notification cannot force every host shell through React again.
const areStepOptionsEquivalent = (
  left: ResolvedTrayStepOptions,
  right: ResolvedTrayStepOptions,
) =>
  left === right ||
  (left.hasFooter === right.hasFooter &&
    left.scale === right.scale &&
    left.keyboardAware === right.keyboardAware &&
    left.fullScreen === right.fullScreen &&
    left.shouldScaleBackground === right.shouldScaleBackground &&
    left.fullScreenBackgroundScale === right.fullScreenBackgroundScale &&
    left.fullScreenDraggable === right.fullScreenDraggable &&
    left.fullScreenCloseBehavior === right.fullScreenCloseBehavior &&
    left.fullScreenTransition === right.fullScreenTransition &&
    left.fullScreenSafeAreaTop === right.fullScreenSafeAreaTop &&
    left.style === right.style &&
    left.className === right.className &&
    left.footerStyle === right.footerStyle &&
    left.footerClassName === right.footerClassName &&
    left.preload === right.preload);

// compare preloaded steps by identity of what they render
export const arePreloadedStepsEquivalent = (
  left: readonly PresentedPreloadedStep[] | undefined,
  right: readonly PresentedPreloadedStep[] | undefined,
) => {
  const leftSteps = left ?? NO_PRELOADED_STEPS;
  const rightSteps = right ?? NO_PRELOADED_STEPS;

  return (
    leftSteps === rightSteps ||
    (leftSteps.length === rightSteps.length &&
      leftSteps.every((step, index) => {
        const other = rightSteps[index]!;

        return (
          step.trayId === other.trayId &&
          step.content === other.content &&
          areStepOptionsEquivalent(step.stepOptions, other.stepOptions)
        );
      }))
  );
};

export const arePresentedTraysEquivalent = (
  left: PresentedTray | null,
  right: PresentedTray | null,
) =>
  left === right ||
  (left !== null &&
    right !== null &&
    left.rootTrayId === right.rootTrayId &&
    left.trayId === right.trayId &&
    left.keyboardAware === right.keyboardAware &&
    (left.keyboardStickyCapable ?? true) ===
      (right.keyboardStickyCapable ?? true) &&
    (left.fullScreenMotionCapable ?? true) ===
      (right.fullScreenMotionCapable ?? true) &&
    areStepOptionsEquivalent(left.stepOptions, right.stepOptions) &&
    left.header === right.header &&
    left.content === right.content &&
    left.footer === right.footer &&
    left.fullScreenBoundaryExit === right.fullScreenBoundaryExit &&
    left.isFirstRender === right.isFirstRender &&
    left.fullScreen === right.fullScreen &&
    left.fullScreenBackgroundScale === right.fullScreenBackgroundScale &&
    left.fullScreenSafeAreaTop === right.fullScreenSafeAreaTop &&
    left.fullScreenDraggable === right.fullScreenDraggable &&
    left.dismissible === right.dismissible &&
    left.transitionContract === right.transitionContract &&
    left.transition === right.transition &&
    left.containerStyle === right.containerStyle &&
    left.className === right.className &&
    left.footerStyle === right.footerStyle &&
    left.footerClassName === right.footerClassName &&
    left.stackIndex === right.stackIndex &&
    left.visible === right.visible &&
    left.interactive === right.interactive &&
    (left.preloadCapable ?? false) === (right.preloadCapable ?? false) &&
    arePreloadedStepsEquivalent(left.preloadedSteps, right.preloadedSteps));

export const areTrayHostSlotsEquivalent = (
  left: [TrayHostSlot, TrayHostSlot],
  right: [TrayHostSlot, TrayHostSlot],
) =>
  left.every((slot, index) => {
    const nextSlot = right[index];

    return (
      slot.assignmentId === nextSlot.assignmentId &&
      slot.visible === nextSlot.visible &&
      slot.interactive === nextSlot.interactive &&
      (slot.prepared ?? false) === (nextSlot.prepared ?? false) &&
      arePresentedTraysEquivalent(slot.payload, nextSlot.payload)
    );
  });

export const arePresentedTrayListsEquivalent = (
  left: PresentedTray[],
  right: PresentedTray[],
) =>
  left.length === right.length &&
  left.every((host, index) => arePresentedTraysEquivalent(host, right[index]!));

export const resolvePresenterTransitionScope = ({
  transition,
  currentStack,
  previousStackTrayIds,
}: {
  transition: TrayTransitionContract | null;
  currentStack: readonly TrayStackEntry[];
  previousStackTrayIds: readonly string[];
}) => {
  if (transition === null) {
    return { root: null, nested: null };
  }

  const currentRootTrayId = currentStack[0]?.trayId;
  const previousRootTrayId = previousStackTrayIds[0];
  const rootTrayIds = new Set(
    [currentRootTrayId, previousRootTrayId].filter(
      (trayId): trayId is string => trayId !== undefined,
    ),
  );
  const nestedTrayIds = new Set([
    ...currentStack.slice(1).map((entry) => entry.trayId),
    ...previousStackTrayIds.slice(1),
  ]);
  const endpointTrayIds = [transition.from?.trayId, transition.to?.trayId];
  const nestedHostsWereRemoved = previousStackTrayIds
    .slice(1)
    .some(
      (trayId) =>
        !currentStack.slice(1).some((entry) => entry.trayId === trayId),
    );
  const affectsRoot = endpointTrayIds.some(
    (trayId) => trayId !== undefined && rootTrayIds.has(trayId),
  );
  const affectsNested =
    transition.reason === "openNested" ||
    transition.reason === "closeNested" ||
    endpointTrayIds.some(
      (trayId) => trayId !== undefined && nestedTrayIds.has(trayId),
    ) ||
    nestedHostsWereRemoved;
  const nestedOnlyTransition =
    transition.reason === "openNested" ||
    transition.reason === "closeNested";

  return {
    root: affectsRoot && !nestedOnlyTransition ? transition : null,
    nested: affectsNested ? transition : null,
  };
};

// choose the next host slot without reusing the current visible slot
export const resolveNextActiveSlotIndex = (
  slots: [TrayHostSlot, TrayHostSlot],
  previousActiveSlotIndex: number | null,
) => {
  if (previousActiveSlotIndex !== null) {
    // alternate slots so outgoing and incoming root trays can overlap safely
    return previousActiveSlotIndex === 0 ? 1 : 0;
  }

  // Claim the prepared controller before an unmounted slot. This keeps the
  // first real presentation on the host that was mounted during provider
  // startup.
  const preparedSlotIndex = slots.findIndex(
    (slot) => slot.prepared === true && !slot.visible,
  );

  if (preparedSlotIndex >= 0) {
    return preparedSlotIndex;
  }

  const idleSlotIndex = slots.findIndex((slot) => slot.payload === null);

  if (idleSlotIndex >= 0) {
    return idleSlotIndex;
  }

  const hiddenSlotIndex = slots.findIndex((slot) => !slot.visible);

  return hiddenSlotIndex >= 0 ? hiddenSlotIndex : 0;
};

// order hosts so interactive content sits above retained content
export const resolveOrderedHostSlots = (
  hostSlots: [TrayHostSlot, TrayHostSlot],
) =>
  hostSlots
    .map((slot, index) => ({
      index,
      slot,
      // interactive hosts render last so they receive touches above closing hosts
      priority: slot.interactive ? 2 : slot.visible ? 1 : 0,
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    });

// convert registry state into the payload consumed by the shell presenter
export const createPresentedTray = ({
  entry,
  registration,
  previousMotionCapabilities,
  previousIndex,
  transition = null,
  stackIndex,
  stackLength,
}: {
  entry: TrayStackEntry;
  registration: TrayRegistration;
  // Preserve capabilities already mounted on this live host when registration
  // input changes; in particular, let a keyboard lease finish its handoff.
  previousMotionCapabilities?: Pick<
    PresentedTray,
    "keyboardStickyCapable" | "fullScreenMotionCapable"
  >;
  previousIndex?: number;
  transition?: TrayTransitionContract | null;
  stackIndex: number;
  stackLength: number;
}): PresentedTray | null => {
  const trayTotal = registration.steps.length;
  const trayIndex = clampTrayStepIndex(entry.index, trayTotal);
  const step = registration.steps[trayIndex];

  if (!step) {
    return null;
  }

  const stepOptions = resolveContextualStepOptions(
    step,
    registration.footer != null,
  );
  const endpoint = resolveTrayPresentationEndpoint({
    entry,
    registration,
    resolvedStepOptions: stepOptions,
  });

  if (!endpoint) {
    return null;
  }

  const animationContract = resolveTrayAnimationContract({
    registration,
    endpoint,
    previousIndex,
    transition,
  });
  const registrationMotionCapabilities =
    getTrayMotionCapabilities(registration);
  const motionCapabilities =
    stackIndex === 0
      ? ROOT_TRAY_MOTION_CAPABILITIES
      : {
          keyboardStickyCapable:
            registrationMotionCapabilities.keyboardStickyCapable ||
            previousMotionCapabilities?.keyboardStickyCapable === true,
          fullScreenMotionCapable:
            registrationMotionCapabilities.fullScreenMotionCapable ||
            previousMotionCapabilities?.fullScreenMotionCapable === true,
        };

  return {
    rootTrayId: entry.trayId,
    trayId: `${entry.trayId}-${step.key}`,
    keyboardAware: stepOptions.keyboardAware,
    ...motionCapabilities,
    stepOptions,
    header: step.header ?? null,
    content: step.content,
    footer: registration.footer ?? null,
    fullScreenBoundaryExit: animationContract.fullScreenBoundaryExit,
    isFirstRender: animationContract.isFirstRender,
    fullScreen: stepOptions.fullScreen,
    fullScreenBackgroundScale: stepOptions.fullScreenBackgroundScale,
    fullScreenSafeAreaTop: stepOptions.fullScreenSafeAreaTop,
    fullScreenDraggable: stepOptions.fullScreenDraggable,
    dismissible: registration.dismissible ?? true,
    transitionContract: animationContract.transition,
    transition: registration.transition,
    containerStyle: stepOptions.style,
    className: stepOptions.className,
    // the tray surface owns the shell background footer styling is opt in so the detached fixed control layer cannot create a second shell surface
    footerStyle: stepOptions.footerStyle,
    footerClassName: stepOptions.footerClassName,
    stackIndex,
    visible: true,
    interactive: stackIndex === stackLength - 1,
    preloadCapable: isPreloadCapable(registration),
    preloadedSteps: resolvePreloadedSteps(
      entry.trayId,
      registration,
      trayIndex,
      stepOptions,
    ),
  };
};

// Mount a content-free nested shell while its trigger is mounted. The parent
// can change a nested presentation's boundary mode, so callers pass the
// parent's static fullscreen capability into this prepared payload.
export const createPreparedNestedTray = (
  rootTrayId: string,
  registration: TrayRegistration,
  parentCanPresentFullScreen = false,
): PresentedTray => {
  const firstStep = registration.steps[0];
  const stepOptions = firstStep
    ? resolveContextualStepOptions(firstStep, registration.footer != null)
    : resolveTrayStepOptions(undefined);
  const ownCapabilities = getTrayMotionCapabilities(registration);

  return {
    rootTrayId,
    trayId: `${rootTrayId}::__prepared__`,
    keyboardAware: false,
    ...ownCapabilities,
    fullScreenMotionCapable:
      ownCapabilities.fullScreenMotionCapable || parentCanPresentFullScreen,
    stepOptions,
    header: null,
    content: null,
    footer: null,
    fullScreenBoundaryExit: false,
    isFirstRender: true,
    fullScreen: false,
    fullScreenBackgroundScale: 1,
    fullScreenSafeAreaTop: false,
    fullScreenDraggable: stepOptions.fullScreenDraggable,
    dismissible: registration.dismissible ?? true,
    transitionContract: null,
    transition: registration.transition,
    stackIndex: -1,
    visible: false,
    interactive: false,
  };
};
