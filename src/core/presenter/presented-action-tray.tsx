// adapt runtime payloads into the animated native shell
import React, { useCallback, useMemo } from "react";
import { TrayHeaderTransitionProvider } from "../../primitives/header-transition-context";
import {
  TrayScopeProvider,
  TrayStepOptionsProvider,
  useTrayRuntimeStore,
} from "../../runtime/tray-context";
import { isActionTrayInstrumentationEnabled } from "../../telemetry/config";
import { logActionTrayProfilerCommit } from "../../telemetry/action-tray-profiler";
import { markTrayStepReactRenderStarted } from "../../telemetry/tray-step-timing";
import { ActionTray } from "../action-tray";
import type { PresentedActionTrayProps } from "../../runtime/presenter/types";
import { arePresentedTraysEquivalent } from "../../runtime/presenter/model";
import {
  PresentedStepWindow,
  type PresentedStepLayer,
} from "./presented-step-window";

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
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    ) => {
      logActionTrayProfilerCommit(
        `action-tray-host:${payload.trayId}`,
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
    () => (
      <PresentedStepWindow
        region="header"
        active={
          {
            key: payload.trayId,
            rootTrayId: payload.rootTrayId,
            content: headerTransitionContent,
            stepOptions: payload.stepOptions,
            fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
            isFirstRender: payload.isFirstRender,
            transitionContract: payload.transitionContract,
            scale: false,
            anchorScaleToTop: false,
          } satisfies PresentedStepLayer
        }
      />
    ),
    [
      headerTransitionContent,
      payload.fullScreenBoundaryExit,
      payload.isFirstRender,
      payload.rootTrayId,
      payload.stepOptions,
      payload.trayId,
      payload.transitionContract,
    ],
  );
  const content = useMemo(
    () => (
      <PresentedStepWindow
        region="content"
        active={
          {
            key: payload.trayId,
            rootTrayId: payload.rootTrayId,
            content: payload.content,
            stepOptions: payload.stepOptions,
            fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
            isFirstRender: payload.isFirstRender,
            transitionContract: payload.transitionContract,
            scale: payload.stepOptions.scale,
            anchorScaleToTop: payload.fullScreen,
          } satisfies PresentedStepLayer
        }
      />
    ),
    [
      payload.content,
      payload.fullScreen,
      payload.fullScreenBoundaryExit,
      payload.isFirstRender,
      payload.rootTrayId,
      payload.stepOptions,
      payload.trayId,
      payload.transitionContract,
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
    <ActionTray
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

const arePresentedActionTrayPropsEqual = (
  previous: PresentedActionTrayProps,
  next: PresentedActionTrayProps,
) =>
  previous.assignmentId === next.assignmentId &&
  previous.onRequestClose === next.onRequestClose &&
  previous.dismissKeyboardForTray === next.dismissKeyboardForTray &&
  arePresentedTraysEquivalent(previous.payload, next.payload);

const MemoizedPresentedActionTray = React.memo(
  PresentedActionTray,
  arePresentedActionTrayPropsEqual,
);

MemoizedPresentedActionTray.displayName = "PresentedActionTray";

export { MemoizedPresentedActionTray as PresentedActionTray };
