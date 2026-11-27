import React, { useRef } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import { TrayContentCommitContext } from "../tray-content-commit";
import { markTrayBoundarySnapshotCommitted } from "../../telemetry/tray-boundary-timing";
import { markTrayStepRenderedCommit } from "../../telemetry/tray-step-timing";
import {
  useTrayRenderSnapshot,
  useTrayRenderSnapshotRegion,
  type TrayRenderSnapshotStore,
} from "../controller/use-tray-render-state";
import type { RenderedTrayState } from "../types";

// step nodes keep their own reconciliation boundary so shell-only updates skip header, body and footer subtrees
export const TrayRenderedNode = React.memo(
  ({ node }: { node: React.ReactNode }) => <>{node}</>,
);

TrayRenderedNode.displayName = "TrayRenderedNode";

export type TraySnapshotRegionName = "header" | "content" | "footer";

// read one payload region so a changing footer or body reconciles locally
export const TraySnapshotRegion = React.memo(
  ({
    store,
    region,
  }: {
    store: TrayRenderSnapshotStore;
    region: TraySnapshotRegionName;
  }) => {
    const node = useTrayRenderSnapshotRegion(store, region);
    const notifyContentCommitted = React.useContext(TrayContentCommitContext);
    const notifyRef = useRef(notifyContentCommitted);
    notifyRef.current = notifyContentCommitted;

    // measure a swapped content node in the commit that mounts it
    useProfiledTrayLayoutEffect("core/visual-view/snapshot-region#1", () => {
      if (region === "content" && node != null) {
        notifyRef.current?.(store.getSnapshot().transitionContract?.generation);
      }
    }, [node, region, store]);

    return <TrayRenderedNode node={node} />;
  },
);

TraySnapshotRegion.displayName = "TraySnapshotRegion";

export const EMPTY_RENDERED_TRAY_STATE: RenderedTrayState = {
  header: null,
  content: null,
  footer: null,
  trayId: undefined,
  transitionContract: null,
};

export const EMPTY_RENDER_SNAPSHOT_STORE: TrayRenderSnapshotStore = {
  getSnapshot: () => EMPTY_RENDERED_TRAY_STATE,
  subscribe: () => () => {},
  publish: () => {},
};

// snapshot publications update telemetry and regions without reconciling the native surface
export const TraySnapshotTelemetry = React.memo(
  ({
    store,
    override,
    rootTrayId,
    visible,
  }: {
    store?: TrayRenderSnapshotStore;
    override?: RenderedTrayState;
    rootTrayId?: string;
    visible: boolean;
  }) => {
    const committedSnapshot = useTrayRenderSnapshot(
      store ?? EMPTY_RENDER_SNAPSHOT_STORE,
    );
    const snapshot = override ?? committedSnapshot;

    useProfiledTrayLayoutEffect(
      "TraySnapshotTelemetry.commitSnapshot",
      () => {
        if (!visible || snapshot.trayId === undefined) {
          return;
        }

        markTrayBoundarySnapshotCommitted(
          rootTrayId,
          snapshot.transitionContract,
          snapshot.trayId,
        );
        markTrayStepRenderedCommit(
          rootTrayId,
          snapshot.trayId,
          snapshot.transitionContract?.generation,
        );
      },
      [rootTrayId, snapshot, visible],
    );

    return null;
  },
);

TraySnapshotTelemetry.displayName = "TraySnapshotTelemetry";
