import React, { useCallback, useMemo, useRef, useState } from "react";
import { useProfiledTrayLayoutEffect } from "../../../telemetry/tray-layout-effect-profiler";
import { arePresentedTrayListsEquivalent } from "../model";
import type { PresentedTray } from "../types";
import {
  EMPTY_PRESENTED_TRAYS,
  NOOP_CLOSE_COMPLETE,
  areHostCommonPropsEquivalent,
  resolveClosingPresentedTray,
  type HostCommonProps,
} from "./common";

// nested hosts stay in stack order while the active root changes
export const NestedTrayStackImpl = ({
  hosts,
  prewarmedHosts = EMPTY_PRESENTED_TRAYS,
  requestCloseActiveTray,
  dismissKeyboardForTray,
  transitionContract,
  renderHost,
}: HostCommonProps & {
  hosts: PresentedTray[];
  prewarmedHosts?: PresentedTray[];
}) => {
  const Host = renderHost;
  const [closingHosts, setClosingHosts] = useState<PresentedTray[]>([]);
  const previousHostsRef = useRef<PresentedTray[]>([]);
  const assignmentIdByRootTrayIdRef = useRef<Map<string, number>>(new Map());
  const nextAssignmentIdRef = useRef(1);
  const prewarmedRootTrayIdsRef = useRef<Set<string>>(new Set());
  prewarmedRootTrayIdsRef.current = new Set(
    prewarmedHosts.map((host) => host.rootTrayId),
  );
  const activeRootTrayIds = useMemo(
    () => new Set(hosts.map((host) => host.rootTrayId)),
    [hosts],
  );

  // assignment identity belongs to the mounted host, a stack index would reset its controller when a sibling opens or closes
  const getAssignmentId = (rootTrayId: string) => {
    const existingAssignmentId =
      assignmentIdByRootTrayIdRef.current.get(rootTrayId);

    if (existingAssignmentId !== undefined) {
      return existingAssignmentId;
    }

    const assignmentId = nextAssignmentIdRef.current;
    nextAssignmentIdRef.current += 1;
    assignmentIdByRootTrayIdRef.current.set(rootTrayId, assignmentId);
    return assignmentId;
  };

  // removed hosts keep state so they stay mounted for their close animation, the previous list keeps them in this render
  const closingHostsByRootTrayId = new Map<string, PresentedTray>();

  closingHosts.forEach((host) => {
    if (!activeRootTrayIds.has(host.rootTrayId)) {
      closingHostsByRootTrayId.set(
        host.rootTrayId,
        resolveClosingPresentedTray(host, transitionContract),
      );
    }
  });

  previousHostsRef.current.forEach((host) => {
    if (!activeRootTrayIds.has(host.rootTrayId)) {
      closingHostsByRootTrayId.set(
        host.rootTrayId,
        resolveClosingPresentedTray(host, transitionContract),
      );
    }
  });

  const hostsForRender = [...closingHostsByRootTrayId.values(), ...hosts].sort(
    (left, right) => left.stackIndex - right.stackIndex,
  );

  const activeOrClosingRootTrayIds = new Set(
    hostsForRender.map((host) => host.rootTrayId),
  );
  const preparedHostsForRender = prewarmedHosts.filter(
    (host) => !activeOrClosingRootTrayIds.has(host.rootTrayId),
  );

  useProfiledTrayLayoutEffect(
    "NestedTrayStackImpl.pruneAssignments",
    () => {
      const retainedRootTrayIds = new Set([
        ...prewarmedHosts.map((host) => host.rootTrayId),
        ...hostsForRender.map((host) => host.rootTrayId),
      ]);

      assignmentIdByRootTrayIdRef.current.forEach(
        (_assignmentId, rootTrayId) => {
          if (!retainedRootTrayIds.has(rootTrayId)) {
            assignmentIdByRootTrayIdRef.current.delete(rootTrayId);
          }
        },
      );
    },
    [hostsForRender, prewarmedHosts],
  );

  useProfiledTrayLayoutEffect(
    "NestedTrayStackImpl.syncClosingHosts",
    () => {
      const previousHosts = previousHostsRef.current;
      previousHostsRef.current = hosts;

      setClosingHosts((current) => {
        const nextByRootTrayId = new Map<string, PresentedTray>();

        current.forEach((host) => {
          if (!activeRootTrayIds.has(host.rootTrayId)) {
            nextByRootTrayId.set(
              host.rootTrayId,
              resolveClosingPresentedTray(host, transitionContract),
            );
          }
        });

        previousHosts.forEach((host) => {
          if (!activeRootTrayIds.has(host.rootTrayId)) {
            nextByRootTrayId.set(
              host.rootTrayId,
              resolveClosingPresentedTray(host, transitionContract),
            );
          }
        });

        const next = [...nextByRootTrayId.values()].sort(
          (left, right) => left.stackIndex - right.stackIndex,
        );

        return arePresentedTrayListsEquivalent(current, next) ? current : next;
      });
    },
    [activeRootTrayIds, hosts, transitionContract],
  );

  const handleCloseComplete = useCallback((rootTrayId: string) => {
    if (!prewarmedRootTrayIdsRef.current.has(rootTrayId)) {
      assignmentIdByRootTrayIdRef.current.delete(rootTrayId);
    }

    setClosingHosts((current) => {
      const next = current.filter((host) => host.rootTrayId !== rootTrayId);

      return next.length === current.length ? current : next;
    });
  }, []);

  return (
    <>
      {[
        ...preparedHostsForRender.map((payload) => ({
          payload,
          prepared: true,
        })),
        ...hostsForRender.map((payload) => ({
          payload,
          prepared: false,
        })),
      ]
        .sort(
          (left, right) => left.payload.stackIndex - right.payload.stackIndex,
        )
        .map(({ payload, prepared }) => (
          <Host
            key={`tray-nested-host-${payload.rootTrayId}`}
            payload={payload}
            prepared={prepared}
            assignmentId={getAssignmentId(payload.rootTrayId)}
            onRequestClose={requestCloseActiveTray}
            onCloseComplete={
              prepared
                ? NOOP_CLOSE_COMPLETE
                : () => handleCloseComplete(payload.rootTrayId)
            }
            dismissKeyboardForTray={dismissKeyboardForTray}
          />
        ))}
    </>
  );
};

export type NestedTrayStackProps = HostCommonProps & {
  hosts: PresentedTray[];
  prewarmedHosts?: PresentedTray[];
};

export const areNestedTrayStackPropsEquivalent = (
  previous: NestedTrayStackProps,
  next: NestedTrayStackProps,
) =>
  areHostCommonPropsEquivalent(previous, next) &&
  (previous.hosts === next.hosts ||
    arePresentedTrayListsEquivalent(previous.hosts, next.hosts)) &&
  ((previous.prewarmedHosts ?? EMPTY_PRESENTED_TRAYS) ===
    (next.prewarmedHosts ?? EMPTY_PRESENTED_TRAYS) ||
    arePresentedTrayListsEquivalent(
      previous.prewarmedHosts ?? EMPTY_PRESENTED_TRAYS,
      next.prewarmedHosts ?? EMPTY_PRESENTED_TRAYS,
    ));

export const MemoizedNestedTrayStack = React.memo(
  NestedTrayStackImpl,
  areNestedTrayStackPropsEquivalent,
);

MemoizedNestedTrayStack.displayName = "NestedTrayStack";

export const NestedTrayStack = MemoizedNestedTrayStack;
