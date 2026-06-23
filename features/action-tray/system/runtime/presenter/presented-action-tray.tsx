import React, { useCallback } from "react";
import { ActionTray } from "../../core/action-tray";
import { isActionTrayInstrumentationEnabled } from "../../telemetry/config";
import { markTrayStepReactRenderStarted } from "../../telemetry/tray-step-timing";
import type {
  PresentedTray,
  TrayKeyboardHeight,
} from "./types";

// bridge presenter payloads into one animated shell instance
type PresentedActionTrayProps = {
  payload: PresentedTray;
  assignmentId: number;
  keyboardHeight: TrayKeyboardHeight;
  onRequestClose: () => void;
  onCloseComplete: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
};

export const PresentedActionTray = ({
  payload,
  assignmentId,
  keyboardHeight,
  onRequestClose,
  onCloseComplete,
  dismissKeyboardForTray,
}: PresentedActionTrayProps) => {
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
  const tray = (
    <ActionTray
      assignmentId={assignmentId}
      visible={payload.visible}
      interactive={payload.interactive}
      keyboardTransitionMode={payload.keyboardTransitionMode}
      rootTrayId={payload.rootTrayId}
      content={payload.content}
      header={payload.header}
      footer={payload.footer}
      onClose={payload.interactive ? onRequestClose : () => {}}
      onCloseComplete={onCloseComplete}
      trayId={payload.trayId}
      fullScreen={payload.fullScreen}
      fullScreenBackgroundScale={payload.fullScreenBackgroundScale}
      fullScreenSafeAreaTop={payload.fullScreenSafeAreaTop}
      fullScreenDraggable={payload.fullScreenDraggable}
      dismissible={payload.dismissible}
      transition={payload.transition}
      containerStyle={payload.containerStyle}
      className={payload.className}
      footerStyle={payload.footerStyle}
      footerClassName={payload.footerClassName}
      keyboardHeight={keyboardHeight}
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
