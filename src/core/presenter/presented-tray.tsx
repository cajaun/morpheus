// runtime payloads adapted into the animated native shell
import React, { useCallback, useMemo, useRef } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import {
  createStepFooterStore,
  TrayStepFooterRegionContext,
  TrayStepFooterStoreContext,
} from "../step-footer";
import { useTrayRuntimeStore } from "../../runtime/tray-context";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import { logTrayProfilerCommit } from "../../telemetry/tray-profiler";
import { markTrayBoundaryReactRender } from "../../telemetry/tray-boundary-timing";
import { markTrayStepReactRenderStarted } from "../../telemetry/tray-step-timing";
import { Tray } from "../tray";
import type { PresentedTrayProps } from "../../runtime/presenter/types";
import { arePresentedTraysEquivalent } from "../../runtime/presenter/model";
import {
  createPresentedTrayPayloadStore,
  type PresentedTrayPayloadStore,
} from "./regions/payload-store";
import { PresentedTrayRegion } from "./regions/presented-tray-region";

// one resolved payload through the animated shell and content layers
const PresentedTray = ({
  payload,
  assignmentId,
  prepared = false,
  onRequestClose,
  onCloseComplete,
  dismissKeyboardForTray,
}: PresentedTrayProps) => {
  const runtime = useTrayRuntimeStore();
  const transitionContract = payload.transitionContract;
  const onCloseCompleteRef = useRef(onCloseComplete);
  onCloseCompleteRef.current = onCloseComplete;
  const handleCloseComplete = useCallback(() => {
    onCloseCompleteRef.current?.();
  }, []);
  const payloadStoreRef = useRef<{
    assignmentId: number;
    prepared: boolean;
    store: PresentedTrayPayloadStore;
  } | null>(null);

  if (
    payloadStoreRef.current === null ||
    payloadStoreRef.current.assignmentId !== assignmentId ||
    payloadStoreRef.current.prepared !== prepared
  ) {
    payloadStoreRef.current = {
      assignmentId,
      prepared,
      store: createPresentedTrayPayloadStore(payload),
    };
  }

  const payloadStore = payloadStoreRef.current.store;
  const stepFooterStoreRef = useRef<{
    store: ReturnType<typeof createStepFooterStore>;
    payloadStore: PresentedTrayPayloadStore;
  } | null>(null);

  if (stepFooterStoreRef.current?.payloadStore !== payloadStore) {
    stepFooterStoreRef.current = {
      store: createStepFooterStore(),
      payloadStore,
    };
  }

  const stepFooterStore = stepFooterStoreRef.current.store;

  // publish after the host commit so regions never see a payload the shell has not committed, closing hosts keep their last payload
  useProfiledTrayLayoutEffect("PresentedTray.publishPayload", () => {
    if (payload.visible) {
      // place the step's footer first so it renders in the same commit as the step's regions
      if (payload.stepFooterKey !== undefined) {
        stepFooterStore.commit(payload);
      }

      payloadStore.publish(payload);
    }
  }, [payload, payloadStore, stepFooterStore]);

  const hasHeader = Boolean(payload.header);
  const hasContent = payload.content != null;
  const hasFooter = Boolean(payload.footer);
  // fixed per registration, the tray renders footers per step
  const hasStepFooterLayer = payload.stepFooterKey !== undefined;

  const handleProfileRender = useCallback<React.ProfilerOnRenderCallback>(
    (
      _id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    ) => {
      logTrayProfilerCommit(
        `tray-host:${payload.trayId}`,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        {
          rootTrayId: payload.rootTrayId,
          trayId: payload.trayId,
          assignmentId,
          visible: payload.visible,
          interactive: payload.interactive,
        },
      );
      markTrayStepReactRenderStarted(
        payload.rootTrayId,
        payload.trayId,
        actualDuration,
        {
          phase,
          baseDurationMs: baseDuration,
          startTime,
          commitTime,
          transitionGeneration: transitionContract?.generation,
        },
      );
      if (payload.visible && transitionContract?.fullScreenChanged) {
        markTrayBoundaryReactRender(
          payload.rootTrayId,
          transitionContract,
          payload.trayId,
          {
            phase,
            actualDurationMs: actualDuration,
            baseDurationMs: baseDuration,
            profilerStartTimeMs: startTime,
            profilerCommitTimeMs: commitTime,
            profilerSpanMs: commitTime - startTime,
          },
        );
      }
    },
    [
      assignmentId,
      payload.interactive,
      payload.rootTrayId,
      payload.trayId,
      transitionContract,
      payload.visible,
    ],
  );

  const header = useMemo(
    () =>
      hasHeader ? (
        <PresentedTrayRegion
          store={payloadStore}
          region="header"
          assignmentId={assignmentId}
        />
      ) : null,
    [assignmentId, hasHeader, payloadStore],
  );
  const content = useMemo(
    () =>
      hasContent ? (
        <PresentedTrayRegion
          store={payloadStore}
          region="content"
          assignmentId={assignmentId}
        />
      ) : null,
    [assignmentId, hasContent, payloadStore],
  );
  const footer = useMemo(
    () =>
      hasFooter ? (
        <PresentedTrayRegion
          store={payloadStore}
          region="footer"
          assignmentId={assignmentId}
        />
      ) : null,
    [assignmentId, hasFooter, payloadStore],
  );
  const stepFooter = useMemo(
    () =>
      hasStepFooterLayer ? (
        <PresentedTrayRegion
          store={payloadStore}
          region="stepFooter"
          assignmentId={assignmentId}
        />
      ) : null,
    [assignmentId, hasStepFooterLayer, payloadStore],
  );
  const handleDismissKeyboard = useCallback(
    () => dismissKeyboardForTray(payload.rootTrayId),
    [dismissKeyboardForTray, payload.rootTrayId],
  );
  const handleRequestClose = useCallback(() => {
    if (payload.interactive) {
      onRequestClose();
    }
  }, [onRequestClose, payload.interactive]);
  const tray = (
    <Tray
      assignmentId={assignmentId}
      prepared={prepared}
      visible={payload.visible}
      interactive={payload.interactive}
      rootTrayId={payload.rootTrayId}
      content={content}
      header={header}
      footer={footer}
      onClose={handleRequestClose}
      onCloseComplete={prepared ? undefined : handleCloseComplete}
      trayId={payload.trayId}
      keyboardAware={payload.keyboardAware ?? payload.stepOptions.keyboardAware}
      keyboardStickyCapable={payload.keyboardStickyCapable}
      fullScreenMotionCapable={payload.fullScreenMotionCapable}
      fullScreen={payload.fullScreen}
      fullScreenBackgroundScale={payload.fullScreenBackgroundScale}
      fullScreenSafeAreaTop={payload.fullScreenSafeAreaTop}
      fullScreenDraggable={payload.fullScreenDraggable}
      dismissible={payload.dismissible}
      transition={payload.transition}
      transitionContract={payload.transitionContract}
      transitionLifecycle={runtime.transitions}
      containerStyle={payload.containerStyle}
      className={payload.className}
      footerStyle={payload.footerStyle}
      footerClassName={payload.footerClassName}
      dismissKeyboard={handleDismissKeyboard}
    />
  );

  const presentedTray = stepFooter ? (
    <TrayStepFooterStoreContext.Provider value={stepFooterStore}>
      <TrayStepFooterRegionContext.Provider value={stepFooter}>
        {tray}
      </TrayStepFooterRegionContext.Provider>
    </TrayStepFooterStoreContext.Provider>
  ) : (
    tray
  );

  if (!isTrayInstrumentationEnabled()) {
    return presentedTray;
  }

  return (
    <React.Profiler
      id={`tray-${assignmentId}`}
      onRender={handleProfileRender}
    >
      {presentedTray}
    </React.Profiler>
  );
};

const arePresentedTrayPropsEqual = (
  previous: PresentedTrayProps,
  next: PresentedTrayProps,
) =>
  previous.assignmentId === next.assignmentId &&
  previous.prepared === next.prepared &&
  previous.onRequestClose === next.onRequestClose &&
  previous.dismissKeyboardForTray === next.dismissKeyboardForTray &&
  arePresentedTraysEquivalent(previous.payload, next.payload);

const MemoizedPresentedTray = React.memo(
  PresentedTray,
  arePresentedTrayPropsEqual,
);

MemoizedPresentedTray.displayName = "PresentedTray";

export { MemoizedPresentedTray as PresentedTray };
