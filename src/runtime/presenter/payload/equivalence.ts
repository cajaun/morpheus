import { type ResolvedTrayStepOptions } from "../../tray-context";
import type {
  PresentedPreloadedStep,
  PresentedTray,
  TrayHostSlot,
} from "../types";
import { NO_PRELOADED_STEPS } from "./preloading";

// keep existing objects when a derived payload is unchanged so unrelated store notifications skip host renders
export const areStepOptionsEquivalent = (
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

// preloaded steps compare by the identity of what they render
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
          step.header === other.header &&
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
    (left.stepFooter ?? null) === (right.stepFooter ?? null) &&
    left.stepFooterKey === right.stepFooterKey &&
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
