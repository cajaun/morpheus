import {
  DEFAULT_TRAY_STEP_OPTIONS,
  type TrayRegistration,
} from "../../tray-context";
import type { TrayHostSlot } from "../types";

// an empty host slot that takes no input and renders nothing
export const createIdleSlot = (): TrayHostSlot => ({
  assignmentId: 0,
  payload: null,
  visible: false,
  interactive: false,
  prepared: false,
});

export const PREPARED_ROOT_HOST_ID = "__morpheus_prepared_root_host__";

// the pre-mounted root host keeps both motion paths ready so a presentation never mounts them on demand
export const ROOT_TRAY_MOTION_CAPABILITIES = {
  keyboardStickyCapable: true,
  fullScreenMotionCapable: true,
} as const;

export type TrayMotionCapabilities = {
  keyboardStickyCapable: boolean;
  fullScreenMotionCapable: boolean;
};

export const trayMotionCapabilitiesBySteps = new WeakMap<
  TrayRegistration["steps"],
  TrayMotionCapabilities
>();

export const getTrayMotionCapabilities = (
  registration: TrayRegistration,
): TrayMotionCapabilities => {
  const cached = trayMotionCapabilitiesBySteps.get(registration.steps);

  if (cached !== undefined) {
    return cached;
  }

  // scan every step so a transition never changes the motion component tree midway
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

// an inert payload keeps one root controller mounted before the first presentation, the real payload keeps its assignment key
export const createPreparedRootSlot = (assignmentId = 1): TrayHostSlot => ({
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

// the next host slot, never the currently visible one
export const resolveNextActiveSlotIndex = (
  slots: [TrayHostSlot, TrayHostSlot],
  previousActiveSlotIndex: number | null,
) => {
  if (previousActiveSlotIndex !== null) {
    // alternate slots so outgoing and incoming root trays overlap
    return previousActiveSlotIndex === 0 ? 1 : 0;
  }

  // claim the prepared controller first so the first presentation uses the host mounted at startup
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

// interactive content sits above retained content
export const resolveOrderedHostSlots = (
  hostSlots: [TrayHostSlot, TrayHostSlot],
) =>
  hostSlots
    .map((slot, index) => ({
      index,
      slot,
      // interactive hosts render last so they take touches above closing hosts
      priority: slot.interactive ? 2 : slot.visible ? 1 : 0,
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    });
