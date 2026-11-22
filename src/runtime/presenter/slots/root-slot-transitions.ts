import type { TrayTransitionContract } from "../../tray-context";
import { createPreparedRootSlot, resolveNextActiveSlotIndex } from "../model";
import type { PresentedTray, TrayHostSlot } from "../types";
import { commitHostSlots } from "./common";

type Slots = [TrayHostSlot, TrayHostSlot];

export type RootHostSlotRefs = {
  nextAssignmentIdRef: { current: number };
  activeSlotIndexRef: { current: number | null };
  pendingPresentedHostRef: { current: PresentedTray | null };
  lastCommittedActiveHostRef: { current: PresentedTray | null };
};

// the closing slot animates its last committed payload when it belongs to the same root
const resolveClosingPayload = (
  refs: RootHostSlotRefs,
  currentRootTrayId: string | null,
  slotPayload: PresentedTray,
) =>
  refs.lastCommittedActiveHostRef.current?.rootTrayId === currentRootTrayId
    ? refs.lastCommittedActiveHostRef.current
    : slotPayload;

// next slot pair when the active host opens, changes, switches root or closes
export const resolveRootHostSlots = (
  current: Slots,
  {
    activeHost,
    transitionContract,
    refs,
  }: {
    activeHost: PresentedTray | null;
    transitionContract: TrayTransitionContract | null | undefined;
    refs: RootHostSlotRefs;
  },
): Slots => {
  const next = [...current] as [TrayHostSlot, TrayHostSlot];
  const currentActiveSlotIndex = refs.activeSlotIndexRef.current;
  const currentActiveSlot =
    currentActiveSlotIndex !== null ? next[currentActiveSlotIndex] : null;
  const currentRootTrayId = currentActiveSlot?.payload?.rootTrayId ?? null;
  const closingSlotIndex = next.findIndex(
    (slot, index) =>
      index !== currentActiveSlotIndex &&
      slot.payload !== null &&
      !slot.visible &&
      slot.prepared !== true,
  );
  const nextRootTrayId = activeHost?.rootTrayId ?? null;

  if (!activeHost) {
    // removing the active host starts its close animation instead of unmounting it
    refs.pendingPresentedHostRef.current = null;

    if (
      currentActiveSlotIndex === null ||
      currentActiveSlot === null ||
      currentActiveSlot.payload === null
    ) {
      return current;
    }

    const closingActiveSlot = currentActiveSlot;
    const closingSlotPayload = closingActiveSlot.payload;
    if (closingSlotPayload === null) {
      return current;
    }
    const closingPayload = resolveClosingPayload(
      refs,
      currentRootTrayId,
      closingSlotPayload,
    );

    next[currentActiveSlotIndex] = {
      assignmentId: closingActiveSlot.assignmentId,
      payload:
        transitionContract?.from?.trayId === closingPayload.rootTrayId
          ? {
              ...closingPayload,
              transitionContract,
            }
          : closingPayload,
      visible: false,
      interactive: false,
    };
    refs.activeSlotIndexRef.current = null;
    return commitHostSlots(current, next);
  }

  if (refs.pendingPresentedHostRef.current !== null) {
    // the newest host wins while the active slot is still closing
    refs.pendingPresentedHostRef.current = activeHost;
    return current;
  }

  if (currentRootTrayId === nextRootTrayId) {
    const targetSlotIndex = currentActiveSlotIndex ?? 0;
    const targetSlot = next[targetSlotIndex];

    // same-root changes render from activeHost, the slot state covers topology and close boundaries
    const canKeepSameRootHostInRender =
      currentActiveSlotIndex !== null &&
      targetSlot.visible === true &&
      targetSlot.payload?.rootTrayId === activeHost.rootTrayId &&
      targetSlot.prepared !== true;

    if (canKeepSameRootHostInRender) {
      refs.activeSlotIndexRef.current = targetSlotIndex;
      return current;
    }

    next[targetSlotIndex] = {
      assignmentId:
        targetSlot.assignmentId || refs.nextAssignmentIdRef.current + 1,
      payload: activeHost,
      visible: true,
      interactive: activeHost.interactive,
      prepared: false,
    };

    if (targetSlot.assignmentId === 0) {
      refs.nextAssignmentIdRef.current += 1;
      next[targetSlotIndex].assignmentId = refs.nextAssignmentIdRef.current;
    }

    refs.activeSlotIndexRef.current = targetSlotIndex;
    return commitHostSlots(current, next);
  }

  if (
    currentActiveSlotIndex !== null &&
    currentActiveSlot !== null &&
    currentActiveSlot.payload !== null
  ) {
    // switching root trays queues the next host behind the outgoing close
    const closingActiveSlot = currentActiveSlot;
    const closingSlotPayload = closingActiveSlot.payload;
    if (closingSlotPayload === null) {
      return current;
    }
    const closingPayload = resolveClosingPayload(
      refs,
      currentRootTrayId,
      closingSlotPayload,
    );

    refs.pendingPresentedHostRef.current = activeHost;
    next[currentActiveSlotIndex] = {
      assignmentId: closingActiveSlot.assignmentId,
      payload: transitionContract
        ? {
            ...closingPayload,
            transitionContract,
          }
        : closingPayload,
      visible: false,
      interactive: false,
    };
    refs.activeSlotIndexRef.current = null;
    return commitHostSlots(current, next);
  }

  if (closingSlotIndex >= 0) {
    // no replacement mounts while another slot is still closing
    refs.pendingPresentedHostRef.current = activeHost;
    return current;
  }

  // first open or an idle pool claims any available slot
  const nextActiveSlotIndex = resolveNextActiveSlotIndex(next, null);

  refs.nextAssignmentIdRef.current += 1;
  next[nextActiveSlotIndex] = {
    assignmentId:
      next[nextActiveSlotIndex]?.assignmentId ||
      refs.nextAssignmentIdRef.current,
    payload: activeHost,
    visible: true,
    interactive: activeHost.interactive,
    prepared: false,
  };
  const selectedSlot = next[nextActiveSlotIndex];
  if (selectedSlot.assignmentId === refs.nextAssignmentIdRef.current) {
    refs.nextAssignmentIdRef.current += 1;
  }
  refs.activeSlotIndexRef.current = nextActiveSlotIndex;

  return commitHostSlots(current, next);
};

// a closed slot hands over to the pending host or stays mounted as a prepared host
export const resolveRootHostSlotsAfterClose = (
  current: Slots,
  {
    slotIndex,
    assignmentId,
    refs,
  }: { slotIndex: number; assignmentId: number; refs: RootHostSlotRefs },
): Slots => {
  const slot = current[slotIndex];

  if (
    !slot ||
    slot.assignmentId !== assignmentId ||
    slot.visible ||
    refs.activeSlotIndexRef.current === slotIndex
  ) {
    // stale close callbacks leave a reused slot alone
    return current;
  }

  const next = [...current] as [TrayHostSlot, TrayHostSlot];
  const pendingHost = refs.pendingPresentedHostRef.current;

  if (pendingHost) {
    // the replacement tray starts in the slot that finished its close
    refs.nextAssignmentIdRef.current += 1;
    next[slotIndex] = {
      assignmentId: refs.nextAssignmentIdRef.current,
      payload: pendingHost,
      visible: true,
      interactive: pendingHost.interactive,
    };
    refs.activeSlotIndexRef.current = slotIndex;
    refs.pendingPresentedHostRef.current = null;
    return commitHostSlots(current, next);
  }

  // the closed host stays mounted and accepts the next tray without a mount
  next[slotIndex] = {
    ...createPreparedRootSlot(slot.assignmentId),
    prepared: true,
  };
  return commitHostSlots(current, next);
};
