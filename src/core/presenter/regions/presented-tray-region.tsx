import React, { useCallback, useContext, useMemo, useRef, useSyncExternalStore } from "react";
import { TrayContentCommitContext } from "../../tray-content-commit";
import { TrayStepContent } from "../../../tray-step-content";
import {
  TrayContentFooterSlot,
  TrayExitingFooterSlot,
  TrayStepFooterLayers,
  useStepFooterLayerRecorder,
} from "../../step-footer";
import {
  TrayPreloadingContent,
  TrayPreloadingHeader,
} from "../preloading-content";
import { TrayHeaderTransitionProvider } from "../../../primitives/header-transition-context";
import {
  TrayScopeProvider,
  TrayStepOptionsProvider,
} from "../../../runtime/tray-context";
import { profileTrayRegion } from "../../../telemetry/tray-profiler";
import {
  NO_PRELOADED_STEPS,
  createPresentedTrayRegionSelector,
  type PresentedTrayRegionName,
  type PresentedTrayPayloadStore,
} from "./payload-store";
import { useProfiledTrayLayoutEffect } from "../../../telemetry/tray-layout-effect-profiler";

// region elements stay stable while the committed payload flows through a small external store
export const PresentedTrayRegion = ({
  store,
  region,
  assignmentId,
}: {
  store: PresentedTrayPayloadStore;
  region: PresentedTrayRegionName;
  assignmentId: number;
}) => {
  const selectRegion = useMemo(
    () => createPresentedTrayRegionSelector(region),
    [region],
  );
  const getRegionSnapshot = useCallback(
    () => selectRegion(store.getSnapshot()),
    [selectRegion, store],
  );
  const payload = useSyncExternalStore(
    store.subscribe,
    getRegionSnapshot,
    getRegionSnapshot,
  );

  const notifyContentCommitted = useContext(TrayContentCommitContext);
  const notifyRef = useRef(notifyContentCommitted);
  notifyRef.current = notifyContentCommitted;

  // new step content mounts in this commit, so the sheet measures it before the frame
  useProfiledTrayLayoutEffect("core/presenter/regions/presented-tray-region#1", () => {
    if (region === "content" && payload.content != null) {
      // report the generation of the payload this region rendered
      notifyRef.current?.(store.getSnapshot().transitionContract?.generation);
    }
  }, [payload.content, payload.trayId, region, store]);

  const headerTransitionValue = useMemo(
    () => ({
      stepKey: payload.trayId,
      skipEntering: payload.isFirstRender,
      fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
    }),
    [payload.fullScreenBoundaryExit, payload.isFirstRender, payload.trayId],
  );

  const recordLayer = useStepFooterLayerRecorder();
  let regionNode: React.ReactNode = null;

  if (
    region === "header" &&
    payload.header &&
    payload.preloadCapable === true
  ) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayPreloadingHeader
          current={{
            trayId: payload.trayId,
            header: payload.header,
            stepOptions: payload.stepOptions,
            fullScreen: payload.fullScreen,
            fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
            isFirstRender: payload.isFirstRender,
          }}
          preloaded={payload.preloadedSteps ?? NO_PRELOADED_STEPS}
        />
      </TrayScopeProvider>
    );
  } else if (region === "header" && payload.header) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          <TrayStepContent
            stepKey={payload.fullScreen ? "fullscreen-header" : "fixed-header"}
            scale={false}
            fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
            skipEntering={payload.isFirstRender}
          >
            <TrayHeaderTransitionProvider value={headerTransitionValue}>
              {payload.header}
            </TrayHeaderTransitionProvider>
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    );
  }

  if (
    region === "content" &&
    payload.content != null &&
    payload.preloadCapable === true
  ) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayPreloadingContent
          current={{
            trayId: payload.trayId,
            content: payload.content,
            stepOptions: payload.stepOptions,
            fullScreen: payload.fullScreen,
            fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
            isFirstRender: payload.isFirstRender,
          }}
          preloaded={payload.preloadedSteps ?? NO_PRELOADED_STEPS}
        />
      </TrayScopeProvider>
    );
  } else if (region === "content" && payload.content != null) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          <TrayStepContent
            stepKey={payload.trayId}
            scale={payload.stepOptions.scale}
            anchorScaleToTop={payload.fullScreen}
            fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
            skipEntering={payload.isFirstRender}
            onLayout={recordLayer(payload.trayId)}
          >
            {payload.content}
            <TrayContentFooterSlot trayId={payload.trayId} />
          </TrayStepContent>
          <TrayExitingFooterSlot
            fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
          />
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    );
  }

  if (region === "footer" && payload.footer) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          {payload.footer}
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    );
  }

  if (region === "stepFooter") {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          <TrayStepFooterLayers
            skipEntering={payload.isFirstRender}
            fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
          />
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    );
  }

  return profileTrayRegion(
    `tray-region:${payload.trayId}:${region}`,
    regionNode,
    {
      region,
      rootTrayId: payload.rootTrayId,
      trayId: payload.trayId,
      assignmentId,
    },
  );
};
