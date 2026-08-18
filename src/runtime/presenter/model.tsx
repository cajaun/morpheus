import React from "react";
import { TrayStepContent } from "../../tray-step-content";
import {
  resolveTrayStepOptions,
  TrayScopeProvider,
  TrayStepOptionsProvider,
  type TrayRegistration,
  type TrayStackEntry,
  type TrayTransitionContract,
} from "../tray-context";
import { resolveTrayPresentationEndpoint } from "../transition-contract";
import { resolveTrayAnimationContract } from "./animation-contract";
import type { PresentedTray, TrayHostSlot } from "./types";

// convert registered tray state into the payload consumed by host slots
const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

export const createIdleSlot = (): TrayHostSlot => ({
  assignmentId: 0,
  payload: null,
  visible: false,
  interactive: false,
});

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
  const trayIndex = clampIndex(entry.index, trayTotal);
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
  // keyboard-aware steps preload keyboard behavior only for the entering step
  const keyboardTransitionMode = stepOptions.keyboardAware ? "entering" : "idle";

  return {
    rootTrayId: entry.trayId,
    trayId: `${entry.trayId}-${step.key}`,
    keyboardTransitionMode,
    header: step.header ? (
      <TrayScopeProvider value={entry.trayId}>
        <TrayStepOptionsProvider value={contextualStepOptions}>
          <TrayStepContent
            stepKey={`${entry.trayId}-${step.key}-header`}
            scale={false}
            fullScreenBoundaryExit={animationContract.fullScreenBoundaryExit}
            skipEntering={animationContract.isFirstRender}
          >
            {step.header}
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    ) : null,
    content: (
      <TrayScopeProvider value={entry.trayId}>
        <TrayStepOptionsProvider value={contextualStepOptions}>
          <TrayStepContent
            stepKey={`${entry.trayId}-${step.key}`}
            scale={stepOptions.scale}
            anchorScaleToTop={stepOptions.fullScreen}
            fullScreenBoundaryExit={animationContract.fullScreenBoundaryExit}
            skipEntering={animationContract.isFirstRender}
          >
            {step.content}
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    ),
    footer: registration.footer ? (
      <TrayScopeProvider value={entry.trayId}>
        <TrayStepOptionsProvider value={contextualStepOptions}>
          {registration.footer}
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    ) : null,
    fullScreen: stepOptions.fullScreen,
    fullScreenBackgroundScale: stepOptions.fullScreenBackgroundScale,
    fullScreenSafeAreaTop: stepOptions.fullScreenSafeAreaTop,
    fullScreenDraggable: stepOptions.fullScreenDraggable,
    dismissible: registration.dismissible ?? true,
    transitionContract: animationContract.transition,
    transition: registration.transition,
    containerStyle: stepOptions.style,
    className: stepOptions.className,
    // The tray surface owns the shell background. Footer styling is opt-in so
    // the detached fixed control layer cannot create a second shell surface.
    footerStyle: stepOptions.footerStyle,
    footerClassName: stepOptions.footerClassName,
    stackIndex,
    visible: true,
    interactive: stackIndex === stackLength - 1,
  };
};
