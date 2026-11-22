import { areTrayHostSlotsEquivalent } from "../model";
import type {
  PresentedTrayRenderer,
  PresentedTray,
  TrayHostSlot,
} from "../types";
import type { TrayTransitionContract } from "../../types";

export const commitHostSlots = (
  current: [TrayHostSlot, TrayHostSlot],
  next: [TrayHostSlot, TrayHostSlot],
) => (areTrayHostSlotsEquivalent(current, next) ? current : next);

export const EMPTY_PRESENTED_TRAYS: PresentedTray[] = [];

export const NOOP_CLOSE_COMPLETE = () => {};

// root slots keep replacement trays pending until the outgoing slot finishes
export type HostCommonProps = {
  requestCloseActiveTray: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
  transitionContract: TrayTransitionContract | null;
  renderHost: PresentedTrayRenderer;
};

// a new transition descriptor is a new lifecycle delivery even when its endpoint fields match
export const areHostCommonPropsEquivalent = (
  previous: HostCommonProps,
  next: HostCommonProps,
) =>
  previous.requestCloseActiveTray === next.requestCloseActiveTray &&
  previous.dismissKeyboardForTray === next.dismissKeyboardForTray &&
  previous.transitionContract === next.transitionContract &&
  previous.renderHost === next.renderHost;

// the payload a closing host keeps animating
export const resolveClosingPresentedTray = (
  host: PresentedTray,
  transitionContract: TrayTransitionContract | null,
): PresentedTray => ({
  ...host,
  transitionContract:
    transitionContract?.from?.trayId === host.rootTrayId
      ? transitionContract
      : host.transitionContract,
  visible: false,
  interactive: false,
});
