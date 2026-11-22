import React, { useCallback, useMemo, useRef, useState } from "react";
import { useProfiledTrayLayoutEffect } from "../../../telemetry/tray-layout-effect-profiler";
import { isTrayInstrumentationEnabled } from "../../../telemetry/config";
import {
  markTrayStepPresenterResolved,
  markTrayStepSlotCommitted,
} from "../../../telemetry/tray-step-timing";
import {
  markTrayBoundaryPresenterResolved,
  markTrayBoundarySlotCommitted,
} from "../../../telemetry/tray-boundary-timing";
import { describeTrayTransition } from "../../transition-diagnostics";
import { log } from "../../logger";
import {
  arePresentedTraysEquivalent,
  createIdleSlot,
  createPreparedRootSlot,
  resolveOrderedHostSlots,
} from "../model";
import type { PresentedTray, TrayHostSlot } from "../types";
import {
  areHostCommonPropsEquivalent,
  resolveClosingPresentedTray,
  type HostCommonProps,
} from "./common";
import {
  resolveRootHostSlots,
  resolveRootHostSlotsAfterClose,
  type RootHostSlotRefs,
} from "./root-slot-transitions";

// root hosts live in two slots so outgoing and incoming shells overlap
export const RootTraySlotsImpl = ({
  activeHost,
  requestCloseActiveTray,
  dismissKeyboardForTray,
  transitionContract,
  renderHost,
}: HostCommonProps & {
  activeHost: PresentedTray | null;
}) => {
  const Host = renderHost;
  const nextAssignmentIdRef = useRef(1);
  const activeSlotIndexRef = useRef<number | null>(activeHost ? 0 : null);
  const pendingPresentedHostRef = useRef<PresentedTray | null>(null);
  // the last committed active payload, close and root replacement animate it
  const lastCommittedActiveHostRef = useRef<PresentedTray | null>(null);
  const slotRefs = useMemo<RootHostSlotRefs>(
    () => ({
      nextAssignmentIdRef,
      activeSlotIndexRef,
      pendingPresentedHostRef,
      lastCommittedActiveHostRef,
    }),
    [],
  );
  const [hostSlots, setHostSlots] = useState<[TrayHostSlot, TrayHostSlot]>(
    () =>
      activeHost
        ? [
            {
              assignmentId: 1,
              payload: activeHost,
              visible: true,
              interactive: activeHost.interactive,
              prepared: false,
            },
            createIdleSlot(),
          ]
        : [createPreparedRootSlot(), createIdleSlot()],
  );

  // a prepared host takes the real payload during this render so measuring starts in the same commit
  const preparedHostSlotIndex = hostSlots.findIndex(
    (slot) => slot.prepared === true && !slot.visible,
  );
  const shouldRenderPreparedHostImmediately =
    activeHost !== null &&
    activeSlotIndexRef.current === null &&
    preparedHostSlotIndex >= 0;
  const activeSlotIndex = activeSlotIndexRef.current;
  const activeSlot =
    activeSlotIndex === null ? null : hostSlots[activeSlotIndex];
  const shouldRenderSameRootHostImmediately =
    activeHost !== null &&
    activeSlotIndex !== null &&
    activeSlot?.visible === true &&
    activeSlot.payload?.rootTrayId === activeHost.rootTrayId;
  const lastCommittedActiveHost = lastCommittedActiveHostRef.current;
  const shouldRenderClosingHostImmediately =
    activeSlotIndex !== null &&
    activeSlot?.visible === true &&
    activeSlot.payload?.rootTrayId !== undefined &&
    lastCommittedActiveHost !== null &&
    lastCommittedActiveHost.rootTrayId === activeSlot.payload.rootTrayId &&
    (activeHost === null ||
      activeHost.rootTrayId !== lastCommittedActiveHost.rootTrayId);
  const slotsForRender =
    shouldRenderPreparedHostImmediately && activeHost !== null
      ? (hostSlots.map((slot, index) =>
          index === preparedHostSlotIndex
            ? {
                assignmentId: slot.assignmentId,
                payload: activeHost,
                visible: true,
                interactive: activeHost.interactive,
                prepared: false,
              }
            : slot,
        ) as [TrayHostSlot, TrayHostSlot])
      : shouldRenderSameRootHostImmediately &&
          activeHost !== null &&
          activeSlotIndex !== null
        ? (hostSlots.map((slot, index) =>
            index === activeSlotIndex
              ? {
                  assignmentId: slot.assignmentId,
                  payload: activeHost,
                  visible: true,
                  interactive: activeHost.interactive,
                  prepared: false,
                }
              : slot,
          ) as [TrayHostSlot, TrayHostSlot])
        : shouldRenderClosingHostImmediately &&
            activeSlotIndex !== null &&
            lastCommittedActiveHost !== null
          ? (hostSlots.map((slot, index) =>
              index === activeSlotIndex
                ? {
                    assignmentId: slot.assignmentId,
                    payload: resolveClosingPresentedTray(
                      lastCommittedActiveHost,
                      transitionContract,
                    ),
                    visible: false,
                    interactive: false,
                    prepared: false,
                  }
                : slot,
            ) as [TrayHostSlot, TrayHostSlot])
          : hostSlots;
  const orderedHostSlots = useMemo(
    () => resolveOrderedHostSlots(slotsForRender),
    [slotsForRender],
  );

  const handleSlotCloseComplete = useCallback(
    (slotIndex: number, assignmentId: number) => {
      setHostSlots((current) =>
        resolveRootHostSlotsAfterClose(current, {
          slotIndex,
          assignmentId,
          refs: slotRefs,
        }),
      );
    },
    [slotRefs],
  );

  useProfiledTrayLayoutEffect(
    "RootTraySlotsImpl.publishSlotState",
    () => {
      if (isTrayInstrumentationEnabled()) {
        markTrayStepPresenterResolved(
          activeHost?.rootTrayId,
          activeHost?.transitionContract?.generation,
          activeHost?.trayId,
        );
        markTrayBoundaryPresenterResolved(
          activeHost?.rootTrayId,
          activeHost?.transitionContract,
          activeHost?.trayId,
        );
      }

      const canRenderSameRootHostWithoutSlotState =
        shouldRenderSameRootHostImmediately &&
        activeHost !== null &&
        activeSlot?.visible === true &&
        activeSlot?.prepared !== true;

      if (canRenderSameRootHostWithoutSlotState) {
        return;
      }

      setHostSlots((current) =>
        resolveRootHostSlots(current, {
          activeHost,
          transitionContract,
          refs: slotRefs,
        }),
      );
    },
    [
      activeHost,
      activeSlot?.payload?.trayId,
      activeSlot?.payload,
      activeSlot?.visible,
      activeSlot?.interactive,
      activeSlot?.prepared,
      shouldRenderSameRootHostImmediately,
      transitionContract,
    ],
  );

  // advance the close snapshot after the active payload commits, after the slot lifecycle effect
  useProfiledTrayLayoutEffect(
    "RootTraySlotsImpl.commitActiveHost",
    () => {
      if (
        activeHost !== null &&
        (shouldRenderPreparedHostImmediately ||
          shouldRenderSameRootHostImmediately)
      ) {
        lastCommittedActiveHostRef.current = activeHost;
      }
    },
    [
      activeHost,
      hostSlots,
      shouldRenderPreparedHostImmediately,
      shouldRenderSameRootHostImmediately,
    ],
  );

  useProfiledTrayLayoutEffect(
    "RootTraySlotsImpl.diagnostics",
    () => {
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
    },
    [activeHost, hostSlots, transitionContract],
  );

  useProfiledTrayLayoutEffect(
    "RootTraySlotsImpl.markSlotCommitted",
    () => {
      if (!isTrayInstrumentationEnabled()) {
        return;
      }

      const activeSlotIndex = activeSlotIndexRef.current;
      const activeSlot =
        activeSlotIndex === null ? null : hostSlots[activeSlotIndex];
      const renderedActiveHost =
        (shouldRenderPreparedHostImmediately ||
          shouldRenderSameRootHostImmediately) &&
        activeHost !== null
          ? activeHost
          : shouldRenderClosingHostImmediately
            ? lastCommittedActiveHost
            : activeSlot?.payload;

      markTrayStepSlotCommitted(
        renderedActiveHost?.rootTrayId,
        renderedActiveHost?.transitionContract?.generation,
        renderedActiveHost?.trayId,
      );
      markTrayBoundarySlotCommitted(
        renderedActiveHost?.rootTrayId,
        renderedActiveHost?.transitionContract,
        renderedActiveHost?.trayId,
      );
    },
    [
      activeHost,
      hostSlots,
      lastCommittedActiveHost,
      shouldRenderClosingHostImmediately,
      shouldRenderPreparedHostImmediately,
      shouldRenderSameRootHostImmediately,
    ],
  );

  return (
    <>
      {orderedHostSlots.map(({ slot, index }) => {
        const payload = slot.payload;

        if (!payload) {
          return null;
        }

        const hostPayload =
          payload.visible === slot.visible &&
          payload.interactive === slot.interactive
            ? payload
            : {
                ...payload,
                visible: slot.visible,
                interactive: slot.interactive,
              };

        return (
          <Host
            key={`tray-root-host-slot-${index}-${slot.assignmentId}`}
            payload={hostPayload}
            prepared={slot.prepared === true}
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

export type RootTraySlotsProps = HostCommonProps & {
  activeHost: PresentedTray | null;
};

export const areRootTraySlotsPropsEquivalent = (
  previous: RootTraySlotsProps,
  next: RootTraySlotsProps,
) =>
  areHostCommonPropsEquivalent(previous, next) &&
  (previous.activeHost === next.activeHost ||
    arePresentedTraysEquivalent(previous.activeHost, next.activeHost));

export const MemoizedRootTraySlots = React.memo(
  RootTraySlotsImpl,
  areRootTraySlotsPropsEquivalent,
);

MemoizedRootTraySlots.displayName = "RootTraySlots";

export const RootTraySlots = MemoizedRootTraySlots;
