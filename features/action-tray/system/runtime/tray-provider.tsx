import React from "react";
import { useActionTrayKeyboard } from "../core/use-action-tray-keyboard";
import {
  TrayHostActionsProvider,
  TrayHostStateProvider,
} from "./tray-context";
import { TrayPresenter } from "./tray-presenter";
import { useTrayFocusManager } from "./use-tray-focus-manager";
import { useTrayRuntime } from "./use-tray-runtime";

export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { keyboardHeight, dismissKeyboard, anticipateKeyboard } =
    useActionTrayKeyboard();
  const { registerFocusable, dismissFocusedInputs } =
    useTrayFocusManager(dismissKeyboard);
  const runtime = useTrayRuntime({
    keyboardHeight,
    anticipateKeyboard,
    dismissFocusedInputs,
    registerFocusable,
  });

  return (
    <TrayHostActionsProvider value={runtime.actions}>
      <TrayHostStateProvider value={runtime.state}>
        {children}

        <TrayPresenter
          registry={runtime.state.registry}
          activeTrayId={runtime.state.activeTrayId}
          activeIndex={runtime.state.activeIndex}
          keyboardHeight={runtime.state.keyboardHeight}
          requestCloseActiveTray={runtime.actions.requestCloseActiveTray}
          dismissKeyboardForTray={runtime.actions.dismissKeyboardForTray}
          justOpenedRef={runtime.justOpenedRef}
        />
      </TrayHostStateProvider>
    </TrayHostActionsProvider>
  );
};
