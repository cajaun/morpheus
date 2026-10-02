// adapt runtime payloads into the animated native shell
import React, { useCallback } from "react";
import { TrayStepContent } from "../../tray-step-content";
import { TrayHeaderTransitionProvider } from "../../primitives/header-transition-context";
import {
  TrayScopeProvider,
  TrayStepOptionsProvider,
  useTrayRuntimeStore,
} from "../../runtime/tray-context";
import { isActionTrayInstrumentationEnabled } from "../../telemetry/config";
import { markTrayStepReactRenderStarted } from "../../telemetry/tray-step-timing";
import { ActionTray } from "../action-tray";
import type { PresentedActionTrayProps } from "../../runtime/presenter/types";

// render one resolved payload through the animated shell and content layers
const PresentedActionTray = ({
  payload,
  assignmentId,
  onRequestClose,
  onCloseComplete,
  dismissKeyboardForTray,
}: PresentedActionTrayProps) => {
  const runtime = useTrayRuntimeStore();
  const handleProfileRender = useCallback<React.ProfilerOnRenderCallback>(
    (
      _id,
      _phase,
      actualDuration,
      _baseDuration,
      startTime,
    ) => {
      markTrayStepReactRenderStarted(
        payload.rootTrayId,
        payload.trayId,
        startTime,
        actualDuration,
      );
    },
    [payload.rootTrayId, payload.trayId],
  );

  const headerTransitionContent = payload.header ? (
    <TrayHeaderTransitionProvider
      value={{
        stepKey: payload.trayId,
        skipEntering: payload.isFirstRender,
        fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
      }}
    >
      {payload.header}
    </TrayHeaderTransitionProvider>
  ) : null;
  const header = payload.header ? (
    <TrayScopeProvider value={payload.rootTrayId}>
      <TrayStepOptionsProvider value={payload.stepOptions}>
        <TrayStepContent
          stepKey={payload.fullScreen ? "fullscreen-header" : "fixed-header"}
          scale={false}
          fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
          skipEntering={payload.isFirstRender}
        >
          {headerTransitionContent}
        </TrayStepContent>
      </TrayStepOptionsProvider>
    </TrayScopeProvider>
  ) : null;
  const content = (
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
  );
  const footer = payload.footer ? (
    <TrayScopeProvider value={payload.rootTrayId}>
      <TrayStepOptionsProvider value={payload.stepOptions}>
        {payload.footer}
      </TrayStepOptionsProvider>
    </TrayScopeProvider>
  ) : null;
  const tray = (
    <ActionTray
      assignmentId={assignmentId}
      visible={payload.visible}
      interactive={payload.interactive}
      rootTrayId={payload.rootTrayId}
      content={content}
      header={header}
      footer={footer}
      onClose={payload.interactive ? onRequestClose : () => {}}
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
      dismissKeyboard={() => dismissKeyboardForTray(payload.rootTrayId)}
    />
  );

  if (!isActionTrayInstrumentationEnabled()) {
    return tray;
  }

  return (
    <React.Profiler
      id={`action-tray-${assignmentId}`}
      onRender={handleProfileRender}
    >
      {tray}
    </React.Profiler>
  );
};

export { PresentedActionTray };
