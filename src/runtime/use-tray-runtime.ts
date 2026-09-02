import { useRef } from "react";
import type { TrayRuntimeStore } from "./types";
import { createTrayRuntimeStore } from "./store/create-tray-runtime-store";

// the store instance must outlive provider rerenders or subscriptions break
// create the runtime store once for the provider lifetime
export const useTrayRuntime = () => {
  const runtimeRef = useRef<TrayRuntimeStore | null>(null);

  if (!runtimeRef.current) {
    // create once because downstream hooks hold references to this store object
    runtimeRef.current = createTrayRuntimeStore();
  }

  return runtimeRef.current;
};
