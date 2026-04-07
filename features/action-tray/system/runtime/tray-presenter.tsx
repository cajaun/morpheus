import React from "react";
import type { SharedValue } from "react-native-reanimated";
import { ActionTray } from "../core/action-tray";
import { TrayStepContent } from "../tray-step-content";
import {
  resolveTrayStepOptions,
  TrayScopeProvider,
  TrayStepOptionsProvider,
  type TrayRegistration,
} from "./tray-context";

const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

type Props = {
  registry: Record<string, TrayRegistration>;
  activeTrayId: string | null;
  activeIndex: number;
  keyboardHeight: SharedValue<number>;
  requestCloseActiveTray: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
  justOpenedRef: React.MutableRefObject<boolean>;
};

export const TrayPresenter: React.FC<Props> = ({
  registry,
  activeTrayId,
  activeIndex,
  keyboardHeight,
  requestCloseActiveTray,
  dismissKeyboardForTray,
  justOpenedRef,
}) => {
  return (
    <>
      {Object.entries(registry).map(([trayId, registration]) => {
        const isActive = activeTrayId === trayId;
        const trayTotal = registration.steps.length;
        const trayIndex = isActive ? clampIndex(activeIndex, trayTotal) : 0;
        const step = registration.steps[trayIndex];
        const stepOptions = resolveTrayStepOptions(step?.options);
        const isFirstRender = justOpenedRef.current && trayIndex === 0;

        const content = isActive && step ? (
          <TrayScopeProvider value={trayId}>
            <TrayStepOptionsProvider value={stepOptions}>
              <TrayStepContent
                stepKey={`${trayId}-${step.key}`}
                scale={stepOptions.scale}
                skipEntering={isFirstRender}
              >
                {step.content}
              </TrayStepContent>
            </TrayStepOptionsProvider>
          </TrayScopeProvider>
        ) : null;

        const footer = isActive && registration.footer ? (
          <TrayScopeProvider value={trayId}>
            <TrayStepOptionsProvider value={stepOptions}>
              {registration.footer}
            </TrayStepOptionsProvider>
          </TrayScopeProvider>
        ) : null;

        return (
          <ActionTray
            key={trayId}
            visible={isActive}
            content={content}
            footer={footer}
            onClose={requestCloseActiveTray}
            trayId={isActive && step ? `${trayId}-${step.key}` : undefined}
            fullScreen={stepOptions.fullScreen}
            fullScreenDraggable={stepOptions.fullScreenDraggable}
            containerStyle={stepOptions.style}
            className={stepOptions.className}
            footerStyle={stepOptions.footerStyle}
            footerClassName={stepOptions.footerClassName}
            keyboardHeight={keyboardHeight}
            dismissKeyboard={() => dismissKeyboardForTray(activeTrayId)}
          />
        );
      })}
    </>
  );
};
