// adapt runtime payloads into the animated native shell
import React, { useCallback, useMemo } from "react";
import { TrayStepContent } from "../../tray-step-content";
import { TrayHeaderTransitionProvider } from "../../primitives/header-transition-context";
import {
  TrayScopeProvider,
  TrayStepOptionsProvider,
  useTrayRuntimeStore,
} from "../../runtime/tray-context";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import { logTrayProfilerCommit } from "../../telemetry/tray-profiler";
import { markTrayStepReactRenderStarted } from "../../telemetry/tray-step-timing";
import { Tray } from "../tray";
import type { PresentedTrayProps } from "../../runtime/presenter/types";
import { arePresentedTraysEquivalent } from "../../runtime/presenter/model";

// render one resolved payload through the animated shell and content layers
const PresentedTray = ({
  payload,
  assignmentId,
  onRequestClose,
  onCloseComplete,
  dismissKeyboardForTray,
}: PresentedTrayProps) => {
  const runtime = useTrayRuntimeStore();
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
      );
    },
    [
      assignmentId,
      payload.interactive,
      payload.rootTrayId,
      payload.trayId,
      payload.visible,
    ],
  );

  const headerTransitionContent = useMemo(
    () =>
      payload.header ? (
        <TrayHeaderTransitionProvider
          value={{
            stepKey: payload.trayId,
            skipEntering: payload.isFirstRender,
            fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
          }}
        >
          {payload.header}
        </TrayHeaderTransitionProvider>
      ) : null,
    [
      payload.fullScreenBoundaryExit,
      payload.header,
      payload.isFirstRender,
      payload.trayId,
    ],
  );
  const header = useMemo(
    () =>
      payload.header ? (
        <TrayScopeProvider value={payload.rootTrayId}>
          <TrayStepOptionsProvider value={payload.stepOptions}>
            <TrayStepContent
              stepKey={
                payload.fullScreen ? "fullscreen-header" : "fixed-header"
              }
              scale={false}
              fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
              skipEntering={payload.isFirstRender}
            >
              {headerTransitionContent}
            </TrayStepContent>
          </TrayStepOptionsProvider>
        </TrayScopeProvider>
      ) : null,
    [
      headerTransitionContent,
      payload.fullScreen,
      payload.fullScreenBoundaryExit,
      payload.header,
      payload.isFirstRender,
      payload.rootTrayId,
      payload.stepOptions,
    ],
  );
  const content = useMemo(
    () => (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          <TrayStepContent
            stepKey={payload.trayId}
            scale={payload.stepOptions.scale}
            anchorScaleToTop={payload.fullScreen}
            fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
            skipEntering={payload.isFirstRender}
          >
            {payload.content}
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    ),
    [
      payload.content,
      payload.fullScreen,
      payload.fullScreenBoundaryExit,
      payload.isFirstRender,
      payload.rootTrayId,
      payload.stepOptions,
      payload.trayId,
    ],
  );
  const footer = useMemo(
    () =>
      payload.footer ? (
        <TrayScopeProvider value={payload.rootTrayId}>
          <TrayStepOptionsProvider value={payload.stepOptions}>
            {payload.footer}
          </TrayStepOptionsProvider>
        </TrayScopeProvider>
      ) : null,
    [payload.footer, payload.rootTrayId, payload.stepOptions],
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
      visible={payload.visible}
      interactive={payload.interactive}
      rootTrayId={payload.rootTrayId}
      content={content}
      header={header}
      footer={footer}
      onClose={handleRequestClose}
      onCloseComplete={onCloseComplete}
      trayId={payload.trayId}
      keyboardAware={payload.keyboardAware ?? payload.stepOptions.keyboardAware}
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

  if (!isTrayInstrumentationEnabled()) {
    return tray;
  }

  return (
    <React.Profiler
      id={`tray-${assignmentId}`}
      onRender={handleProfileRender}
    >
      {tray}
    </React.Profiler>
  );
};

const arePresentedTrayPropsEqual = (
  previous: PresentedTrayProps,
  next: PresentedTrayProps,
) =>
  previous.assignmentId === next.assignmentId &&
  previous.onRequestClose === next.onRequestClose &&
  previous.dismissKeyboardForTray === next.dismissKeyboardForTray &&
  arePresentedTraysEquivalent(previous.payload, next.payload);

const MemoizedPresentedTray = React.memo(
  PresentedTray,
  arePresentedTrayPropsEqual,
);

MemoizedPresentedTray.displayName = "PresentedTray";

export { MemoizedPresentedTray as PresentedTray };
