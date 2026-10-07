import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isActionTrayInstrumentationEnabled } from "../../telemetry/config";
import {
  markTrayStepPresenterResolved,
  markTrayStepSlotCommitted,
} from "../../telemetry/tray-step-timing";
import { describeTrayTransition } from "../transition-diagnostics";
import { log } from "../logger";
import {
  arePresentedTraysEquivalent,
  arePresentedTrayListsEquivalent,
  areTrayHostSlotsEquivalent,
  createIdleSlot,
  resolveNextActiveSlotIndex,
  resolveOrderedHostSlots,
} from "./model";
import type {
  PresentedActionTrayRenderer,
  PresentedTray,
  TrayHostSlot,
} from "./types";
import type { TrayTransitionContract } from "../types";

const commitHostSlots = (
  current: [TrayHostSlot, TrayHostSlot],
  next: [TrayHostSlot, TrayHostSlot],
) => (areTrayHostSlotsEquivalent(current, next) ? current : next);

// root slots keep replacement trays pending until the outgoing slot finishes
type HostCommonProps = {
  requestCloseActiveTray: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
  transitionContract: TrayTransitionContract | null;
  renderHost: PresentedActionTrayRenderer;
};

// Presenter boundaries may skip unrelated parent renders, but a transition
// descriptor remains identity-sensitive: a new descriptor is a new lifecycle
// delivery even when its endpoint fields happen to be equal.
const areHostCommonPropsEquivalent = (
  previous: HostCommonProps,
  next: HostCommonProps,
) =>
  previous.requestCloseActiveTray === next.requestCloseActiveTray &&
  previous.dismissKeyboardForTray === next.dismissKeyboardForTray &&
  previous.transitionContract === next.transitionContract &&
  previous.renderHost === next.renderHost;

// keep root hosts in two slots so outgoing and incoming shells can overlap
const RootTraySlotsImpl = ({
  activeHost,
  requestCloseActiveTray,
  dismissKeyboardForTray,
  transitionContract,
  renderHost,
}: HostCommonProps & {
  activeHost: PresentedTray | null;
}) => {
  const Host = renderHost;
  const nextAssignmentIdRef = useRef(0);
  const activeSlotIndexRef = useRef<number | null>(null);
  const pendingPresentedHostRef = useRef<PresentedTray | null>(null);
  const [hostSlots, setHostSlots] = useState<[TrayHostSlot, TrayHostSlot]>([
    createIdleSlot(),
    createIdleSlot(),
  ]);

  const orderedHostSlots = useMemo(
    () => resolveOrderedHostSlots(hostSlots),
    [hostSlots],
  );

  const handleSlotCloseComplete = useCallback(
    (slotIndex: number, assignmentId: number) => {
      setHostSlots((current) => {
        const slot = current[slotIndex];

        if (
          !slot ||
          slot.assignmentId !== assignmentId ||
          slot.visible ||
          activeSlotIndexRef.current === slotIndex
        ) {
          // stale close callbacks should not clear a reused slot
          return current;
        }

        const next = [...current] as [TrayHostSlot, TrayHostSlot];
        const pendingHost = pendingPresentedHostRef.current;

        if (pendingHost) {
          // replacement tray starts in the slot that already completed its close
          nextAssignmentIdRef.current += 1;
          next[slotIndex] = {
            assignmentId: nextAssignmentIdRef.current,
            payload: pendingHost,
            visible: true,
            interactive: pendingHost.interactive,
          };
          activeSlotIndexRef.current = slotIndex;
          pendingPresentedHostRef.current = null;
          return commitHostSlots(current, next);
        }

        next[slotIndex] = createIdleSlot();
        return commitHostSlots(current, next);
      });
    },
    [],
  );

  useLayoutEffect(() => {
    if (isActionTrayInstrumentationEnabled()) {
      markTrayStepPresenterResolved(activeHost?.rootTrayId);
    }

    setHostSlots((current) => {
      const next = [...current] as [TrayHostSlot, TrayHostSlot];
      const currentActiveSlotIndex = activeSlotIndexRef.current;
      const currentActiveSlot =
        currentActiveSlotIndex !== null ? next[currentActiveSlotIndex] : null;
      const currentRootTrayId = currentActiveSlot?.payload?.rootTrayId ?? null;
      const closingSlotIndex = next.findIndex(
        (slot, index) =>
          index !== currentActiveSlotIndex &&
          slot.payload !== null &&
          !slot.visible,
      );
      const nextRootTrayId = activeHost?.rootTrayId ?? null;

      if (!activeHost) {
        // removing the active host begins its close animation instead of unmounting it
        pendingPresentedHostRef.current = null;

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
        const closingPayload = closingSlotPayload;

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
        activeSlotIndexRef.current = null;
        return commitHostSlots(current, next);
      }

      if (pendingPresentedHostRef.current !== null) {
        // newest host wins while the current active slot is still closing
        pendingPresentedHostRef.current = activeHost;
        return current;
      }

      if (currentRootTrayId === nextRootTrayId) {
        const targetSlotIndex = currentActiveSlotIndex ?? 0;
        const targetSlot = next[targetSlotIndex];

        next[targetSlotIndex] = {
          assignmentId:
            targetSlot.assignmentId || nextAssignmentIdRef.current + 1,
          payload: activeHost,
          visible: true,
          interactive: activeHost.interactive,
        };

        if (targetSlot.assignmentId === 0) {
          nextAssignmentIdRef.current += 1;
          next[targetSlotIndex].assignmentId = nextAssignmentIdRef.current;
        }

        activeSlotIndexRef.current = targetSlotIndex;
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
        const closingPayload = closingSlotPayload;

        pendingPresentedHostRef.current = activeHost;
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
        activeSlotIndexRef.current = null;
        return commitHostSlots(current, next);
      }

      if (closingSlotIndex >= 0) {
        // do not mount a replacement while any non active slot is still closing
        pendingPresentedHostRef.current = activeHost;
        return current;
      }

      // first open or fully idle pool can claim any available slot
      const nextActiveSlotIndex = resolveNextActiveSlotIndex(next, null);

      nextAssignmentIdRef.current += 1;
      next[nextActiveSlotIndex] = {
        assignmentId: nextAssignmentIdRef.current,
        payload: activeHost,
        visible: true,
        interactive: activeHost.interactive,
      };
      activeSlotIndexRef.current = nextActiveSlotIndex;

      return commitHostSlots(current, next);
    });
  }, [activeHost, transitionContract]);

  useLayoutEffect(() => {
    log("HOST SLOT STATE", {
      activeHost: activeHost
        ? {
            rootTrayId: activeHost.rootTrayId,
            trayId: activeHost.trayId,
            fullScreen: activeHost.fullScreen,
            visible: activeHost.visible,
            interactive: activeHost.interactive,
          }
        : null,
      transition: describeTrayTransition(transitionContract),
      activeSlotIndex: activeSlotIndexRef.current,
      pendingHost: pendingPresentedHostRef.current
        ? {
            rootTrayId: pendingPresentedHostRef.current.rootTrayId,
            trayId: pendingPresentedHostRef.current.trayId,
            fullScreen: pendingPresentedHostRef.current.fullScreen,
          }
        : null,
      slots: hostSlots.map((slot) => ({
        assignmentId: slot.assignmentId,
        visible: slot.visible,
        interactive: slot.interactive,
        rootTrayId: slot.payload?.rootTrayId,
        trayId: slot.payload?.trayId,
        fullScreen: slot.payload?.fullScreen,
      })),
    });
  }, [activeHost, hostSlots, transitionContract]);

  useLayoutEffect(() => {
    if (!isActionTrayInstrumentationEnabled()) {
      return;
    }

    const activeSlotIndex = activeSlotIndexRef.current;
    const activeSlot =
      activeSlotIndex === null ? null : hostSlots[activeSlotIndex];

    markTrayStepSlotCommitted(activeSlot?.payload?.rootTrayId);
  }, [hostSlots]);

  return (
    <>
      {orderedHostSlots.map(({ slot, index }) => {
        const payload = slot.payload;

        if (!payload) {
          return null;
        }

        return (
          <Host
            key={`tray-root-host-slot-${index}-${slot.assignmentId}`}
            payload={{
              ...payload,
              visible: slot.visible,
              interactive: slot.interactive,
            }}
            assignmentId={slot.assignmentId}
            onRequestClose={requestCloseActiveTray}
            onCloseComplete={() =>
              handleSlotCloseComplete(index, slot.assignmentId)
            }
            dismissKeyboardForTray={dismissKeyboardForTray}
          />
        );
      })}
    </>
  );
};

type RootTraySlotsProps = HostCommonProps & {
  activeHost: PresentedTray | null;
};

const areRootTraySlotsPropsEquivalent = (
  previous: RootTraySlotsProps,
  next: RootTraySlotsProps,
) =>
  areHostCommonPropsEquivalent(previous, next) &&
  (previous.activeHost === next.activeHost ||
    arePresentedTraysEquivalent(previous.activeHost, next.activeHost));

const MemoizedRootTraySlots = React.memo(
  RootTraySlotsImpl,
  areRootTraySlotsPropsEquivalent,
);

MemoizedRootTraySlots.displayName = "RootTraySlots";

export const RootTraySlots = MemoizedRootTraySlots;

// retain nested hosts in stack order while the active root changes
const NestedTrayStackImpl = ({
  hosts,
  requestCloseActiveTray,
  dismissKeyboardForTray,
  transitionContract,
  renderHost,
}: HostCommonProps & {
  hosts: PresentedTray[];
}) => {
  const Host = renderHost;
  const [renderedHosts, setRenderedHosts] = useState<PresentedTray[]>([]);

  useEffect(() => {
    setRenderedHosts((current) => {
      const nextByRootTrayId = new Map(
        hosts.map((host) => [host.rootTrayId, host]),
      );
      const retainedClosingHosts = current
        .filter((host) => !nextByRootTrayId.has(host.rootTrayId))
        .map((host) => ({
          ...host,
          transitionContract:
            transitionContract?.from?.trayId === host.rootTrayId
              ? transitionContract
              : host.transitionContract,
          visible: false,
          interactive: false,
        }));

      // nested hosts keep closing payloads until their own close completion fires
      const next = [...retainedClosingHosts, ...hosts].sort(
        (left, right) => left.stackIndex - right.stackIndex,
      );

      return arePresentedTrayListsEquivalent(current, next) ? current : next;
    });
  }, [hosts, transitionContract]);

  const handleCloseComplete = useCallback((rootTrayId: string) => {
    setRenderedHosts((current) => {
      const next = current.filter(
        (host) => host.visible || host.rootTrayId !== rootTrayId,
      );

      return next.length === current.length ? current : next;
    });
  }, []);

  return (
    <>
      {renderedHosts.map((payload) => (
        <Host
          key={`tray-nested-host-${payload.rootTrayId}`}
          payload={payload}
          assignmentId={payload.stackIndex + 1}
          onRequestClose={requestCloseActiveTray}
          onCloseComplete={() => handleCloseComplete(payload.rootTrayId)}
          dismissKeyboardForTray={dismissKeyboardForTray}
        />
      ))}
    </>
  );
};

type NestedTrayStackProps = HostCommonProps & {
  hosts: PresentedTray[];
};

const areNestedTrayStackPropsEquivalent = (
  previous: NestedTrayStackProps,
  next: NestedTrayStackProps,
) =>
  areHostCommonPropsEquivalent(previous, next) &&
  (previous.hosts === next.hosts ||
    arePresentedTrayListsEquivalent(previous.hosts, next.hosts));

const MemoizedNestedTrayStack = React.memo(
  NestedTrayStackImpl,
  areNestedTrayStackPropsEquivalent,
);

MemoizedNestedTrayStack.displayName = "NestedTrayStack";

export const NestedTrayStack = MemoizedNestedTrayStack;
