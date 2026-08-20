import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import { DEFAULT_TRAY_STEP_OPTIONS } from "./tray-step-options";
import type {
  ResolvedTrayStepOptions,
  TrayHostStateValue,
  TrayRuntimeStore,
} from "./types";

// context exposes stable runtime services without mixing them with navigation policy
const TrayStoreContext = createContext<TrayRuntimeStore | null>(null);
const TrayScopeContext = createContext<string | null>(null);
const TrayStepOptionsContext =
  createContext<ResolvedTrayStepOptions>(DEFAULT_TRAY_STEP_OPTIONS);

export const TrayStoreProvider = TrayStoreContext.Provider;
export const TrayScopeProvider = TrayScopeContext.Provider;
export const TrayStepOptionsProvider = TrayStepOptionsContext.Provider;

export const useTrayRuntimeStore = () => {
  const store = useContext(TrayStoreContext);

  if (!store) {
    throw new Error("Must be used within TrayProvider");
  }

  return store;
};

export const useTrayHostSelector = <T,>(
  selector: (state: TrayHostStateValue) => T,
) => {
  const store = useTrayRuntimeStore();
  // selectors limit rerenders to the state selected by each consumer
  const getSnapshot = useCallback(
    () => selector(store.getState()),
    [selector, store],
  );

  return useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    getSnapshot,
  );
};

export const useTrayHostState = () => useTrayHostSelector((state) => state);

export const useTrayHostActions = () => useTrayRuntimeStore().actions;

export const useTrayTransitionLifecycle = () =>
  useTrayRuntimeStore().transitions;

export const useTrayHost = () => {
  const state = useTrayHostState();
  const actions = useTrayHostActions();

  // this merged hook supports tests and low level integrations
  return {
    ...state,
    ...actions,
  };
};

export const useTrayScope = () => useContext(TrayScopeContext);

export const useTrayStepOptions = () =>
  useContext(TrayStepOptionsContext);

export {
  DEFAULT_TRAY_STEP_OPTIONS,
  resolveTrayStepOptions,
} from "./tray-step-options";
