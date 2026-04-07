import { useEffect, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { TrayHostActionsValue, TrayRuntimeStore } from "./tray-context";
import { createTrayRuntimeStore } from "./store/create-tray-runtime-store";

type Params = {
  keyboardHeight: SharedValue<number>;
  anticipateKeyboard: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void;
  registerFocusable: TrayHostActionsValue["registerFocusable"];
};

export const useTrayRuntime = ({
  keyboardHeight,
  anticipateKeyboard,
  dismissFocusedInputs,
  registerFocusable,
}: Params) => {
  const runtimeRef = useRef<TrayRuntimeStore | null>(null);

  if (!runtimeRef.current) {
    runtimeRef.current = createTrayRuntimeStore({
      keyboardHeight,
      anticipateKeyboard,
      dismissFocusedInputs,
      registerFocusable,
    });
  }

  useEffect(() => {
    runtimeRef.current?.setDependencies({
      keyboardHeight,
      anticipateKeyboard,
      dismissFocusedInputs,
      registerFocusable,
    });
  }, [
    anticipateKeyboard,
    dismissFocusedInputs,
    keyboardHeight,
    registerFocusable,
  ]);

  return runtimeRef.current;
};
