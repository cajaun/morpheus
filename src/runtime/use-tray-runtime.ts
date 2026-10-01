import { useEffect, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { TrayHostActionsValue, TrayRuntimeStore } from "./types";
import { createTrayRuntimeStore } from "./store/create-tray-runtime-store";

// the store instance must outlive provider rerenders or subscriptions break
type Params = {
  keyboardHeight: SharedValue<number>;
  anticipateKeyboard: () => void;
  prepareKeyboardHandoff: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void | Promise<void>;
  registerFocusable: TrayHostActionsValue["registerFocusable"];
};

// create the runtime store and refresh its external dependencies
export const useTrayRuntime = ({
  keyboardHeight,
  anticipateKeyboard,
  prepareKeyboardHandoff,
  dismissFocusedInputs,
  registerFocusable,
}: Params) => {
  const runtimeRef = useRef<TrayRuntimeStore | null>(null);

  if (!runtimeRef.current) {
    // create once because downstream hooks hold references to this store object
    runtimeRef.current = createTrayRuntimeStore({
      keyboardHeight,
      anticipateKeyboard,
      prepareKeyboardHandoff,
      dismissFocusedInputs,
      registerFocusable,
    });
  }

  useEffect(() => {
    // swap dependencies in place so the store keeps identity but gains fresh handlers
    runtimeRef.current?.setDependencies({
      keyboardHeight,
      anticipateKeyboard,
      prepareKeyboardHandoff,
      dismissFocusedInputs,
      registerFocusable,
    });
  }, [
    anticipateKeyboard,
    prepareKeyboardHandoff,
    dismissFocusedInputs,
    keyboardHeight,
    registerFocusable,
  ]);

  return runtimeRef.current;
};
