import {
  resolveTrayStepOptions,
  type TrayRegistration,
  type TrayStackEntry,
  type TrayTransitionContract,
} from "../tray-context";
import { resolveTrayPresentationEndpoint } from "../transition-contract";
import { clampTrayStepIndex } from "../tray-step-index";
import { resolveTrayAnimationContract } from "./animation-contract";
import type { PresentedTray } from "./types";
import { resolveContextualStepOptions } from "./payload/step-options";
import {
  usesStepFooters,
  resolveStepFooter,
  stepHasFooter,
} from "./payload/step-footers";
import { isPreloadCapable, resolvePreloadedSteps } from "./payload/preloading";
import {
  ROOT_TRAY_MOTION_CAPABILITIES,
  getTrayMotionCapabilities,
} from "./payload/host-slots";
export {
  createIdleSlot,
  createPreparedRootSlot,
  resolveNextActiveSlotIndex,
  resolveOrderedHostSlots,
} from "./payload/host-slots";
export {
  areStepOptionsEquivalent,
  arePreloadedStepsEquivalent,
  arePresentedTraysEquivalent,
  areTrayHostSlotsEquivalent,
  arePresentedTrayListsEquivalent,
} from "./payload/equivalence";
export { usesStepFooters, resolveStepFooter } from "./payload/step-footers";

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
    transition.reason === "openNested" || transition.reason === "closeNested";

  return {
    root: affectsRoot && !nestedOnlyTransition ? transition : null,
    nested: affectsNested ? transition : null,
  };
};

// registry state to the payload the shell presenter consumes
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
  // keep capabilities already mounted on a live host so a keyboard lease can finish its handoff
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
    stepHasFooter(registration, step),
  );
  const stepFooter = resolveStepFooter(registration, step);
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
    footer: usesStepFooters(registration)
      ? null
      : (registration.footer ?? null),
    stepFooter: stepFooter?.node ?? null,
    // undefined marks a tray without step footer layers
    stepFooterKey: usesStepFooters(registration)
      ? (stepFooter?.key ?? null)
      : undefined,
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
    // the tray surface owns the shell background, footer styling is opt-in so the footer layer never forms a second surface
    footerStyle: stepOptions.footerStyle,
    stackIndex,
    visible: true,
    interactive: stackIndex === stackLength - 1,
    preloadCapable: isPreloadCapable(registration),
    preloadedSteps: resolvePreloadedSteps(
      entry.trayId,
      registration,
      trayIndex,
    ),
  };
};

// a content-free nested shell mounts with its trigger and takes the parent's fullscreen capability
export const createPreparedNestedTray = (
  rootTrayId: string,
  registration: TrayRegistration,
  parentCanPresentFullScreen = false,
): PresentedTray => {
  const firstStep = registration.steps[0];
  const stepOptions = firstStep
    ? resolveContextualStepOptions(
        firstStep,
        stepHasFooter(registration, firstStep),
      )
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
