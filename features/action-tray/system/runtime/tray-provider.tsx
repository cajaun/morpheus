import React from "react";
import { useActionTrayKeyboard } from "../core/input/use-action-tray-keyboard";
import { TrayStoreProvider } from "./tray-context";
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
    <TrayStoreProvider value={runtime}>
      {children}

      <TrayPresenter />
    </TrayStoreProvider>
  );
};
