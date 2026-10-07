import {
  resolveTrayStepOptions,
  type ResolvedTrayStepOptions,
  type TrayRegistration,
  type TrayStackEntry,
  type TrayTransitionContract,
} from "../tray-context";
import { resolveTrayPresentationEndpoint } from "../transition-contract";
import { clampTrayStepIndex } from "../tray-step-index";
import { resolveTrayAnimationContract } from "./animation-contract";
import type { PresentedTray, TrayHostSlot } from "./types";

// convert registered tray state into the payload consumed by host slots
// create an empty host slot that cannot receive input or render content
export const createIdleSlot = (): TrayHostSlot => ({
  assignmentId: 0,
  payload: null,
  visible: false,
  interactive: false,
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
    left.footerClassName === right.footerClassName);

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
    left.interactive === right.interactive);

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
      arePresentedTraysEquivalent(slot.payload, nextSlot.payload)
    );
  });

export const arePresentedTrayListsEquivalent = (
  left: PresentedTray[],
  right: PresentedTray[],
) =>
  left.length === right.length &&
  left.every((host, index) => arePresentedTraysEquivalent(host, right[index]!));

// choose the next host slot without reusing the current visible slot
export const resolveNextActiveSlotIndex = (
  slots: [TrayHostSlot, TrayHostSlot],
  previousActiveSlotIndex: number | null,
) => {
  if (previousActiveSlotIndex !== null) {
    // alternate slots so outgoing and incoming root trays can overlap safely
    return previousActiveSlotIndex === 0 ? 1 : 0;
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
  previousIndex,
  transition = null,
  stackIndex,
  stackLength,
}: {
  entry: TrayStackEntry;
  registration: TrayRegistration;
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

  const stepOptions = resolveTrayStepOptions(step.options);
  const contextualStepOptions = {
    ...stepOptions,
    hasFooter: registration.footer != null,
  };
  const endpoint = resolveTrayPresentationEndpoint({ entry, registration });

  if (!endpoint) {
    return null;
  }

  const animationContract = resolveTrayAnimationContract({
    registration,
    endpoint,
    previousIndex,
    transition,
  });
  return {
    rootTrayId: entry.trayId,
    trayId: `${entry.trayId}-${step.key}`,
    keyboardAware: stepOptions.keyboardAware,
    stepOptions: contextualStepOptions,
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
  };
};
