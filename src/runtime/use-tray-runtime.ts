import { useRef } from "react";
import type { TrayHostActionsValue, TrayRuntimeStore } from "./types";
import { createTrayRuntimeStore } from "./store/create-tray-runtime-store";
import { useProfiledTrayEffect } from "../telemetry/tray-layout-effect-profiler";

// the store instance outlives provider renders so subscriptions hold
type Params = {
  anticipateKeyboard: () => void;
  prepareKeyboardHandoff: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void | Promise<void>;
  registerFocusable: TrayHostActionsValue["registerFocusable"];
};

// create the runtime store and refresh its external dependencies
export const useTrayRuntime = ({
  anticipateKeyboard,
  prepareKeyboardHandoff,
  dismissFocusedInputs,
  registerFocusable,
}: Params) => {
  const runtimeRef = useRef<TrayRuntimeStore | null>(null);

  if (!runtimeRef.current) {
    // create once because downstream hooks hold this store object
    runtimeRef.current = createTrayRuntimeStore({
      anticipateKeyboard,
      prepareKeyboardHandoff,
      dismissFocusedInputs,
      registerFocusable,
    });
  }

  useProfiledTrayEffect("runtime/use-tray-runtime#1", () => {
    // swap dependencies in place so the store keeps its identity
    runtimeRef.current?.setDependencies({
      anticipateKeyboard,
      prepareKeyboardHandoff,
      dismissFocusedInputs,
      registerFocusable,
    });
  }, [
    anticipateKeyboard,
    prepareKeyboardHandoff,
    dismissFocusedInputs,
    registerFocusable,
  ]);

  return runtimeRef.current;
};
