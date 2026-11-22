import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useSyncExternalStore,
} from "react";
import { DEFAULT_TRAY_STEP_OPTIONS } from "./tray-step-options";
import type {
  ResolvedTrayStepOptions,
  TrayHostStateValue,
  TrayRuntimeStore,
} from "./types";

// stable runtime services, apart from navigation policy
const TrayStoreContext = createContext<TrayRuntimeStore | null>(null);
const TrayScopeContext = createContext<string | null>(null);
const TrayStepOptionsContext =
  createContext<ResolvedTrayStepOptions>(DEFAULT_TRAY_STEP_OPTIONS);

export const TrayStoreProvider = TrayStoreContext.Provider;
export const TrayScopeProvider = TrayScopeContext.Provider;
export const TrayStepOptionsProvider = TrayStepOptionsContext.Provider;

// tray id of the step a subtree belongs to, a hidden preloaded step reads its own step from it
const TrayStepLayerContext = createContext<string | null>(null);
export const TrayStepLayerProvider = TrayStepLayerContext.Provider;
export const useTrayStepLayer = () => useContext(TrayStepLayerContext);

// the runtime store from the nearest provider
export const useTrayRuntimeStore = () => {
  const store = useContext(TrayStoreContext);

  if (!store) {
    throw new Error("Must be used within TrayProvider");
  }

  return store;
};

// subscribe to one stable selection of the external tray store
export const useTrayHostSelector = <T,>(
  selector: (state: TrayHostStateValue) => T,
) => {
  const store = useTrayRuntimeStore();
  const selectedSnapshotRef = useRef<{
    state: TrayHostStateValue;
    selector: (state: TrayHostStateValue) => T;
    value: T;
  } | null>(null);

  // cache each selector result per store snapshot to meet useSyncExternalStore's stable-snapshot rule
  const getSnapshot = useCallback(
    () => {
      const state = store.getState();
      const cached = selectedSnapshotRef.current;

      if (cached?.state === state && cached.selector === selector) {
        return cached.value;
      }

      const value = selector(state);

      if (cached && Object.is(cached.value, value)) {
        selectedSnapshotRef.current = {
          state,
          selector,
          value: cached.value,
        };
        return cached.value;
      }

      selectedSnapshotRef.current = { state, selector, value };
      return value;
    },
    [selector, store],
  );

  return useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    getSnapshot,
  );
};

// the complete host state for low-level integrations
export const useTrayHostState = () => useTrayHostSelector((state) => state);

// imperative host actions without a state subscription
export const useTrayHostActions = () => useTrayRuntimeStore().actions;

// lifecycle records for diagnostics and integration code
export const useTrayTransitionLifecycle = () =>
  useTrayRuntimeStore().transitions;

// host state and actions for the public convenience hook
export const useTrayHost = () => {
  const state = useTrayHostState();
  const actions = useTrayHostActions();

  // the merged hook supports tests and low-level integrations
  return {
    ...state,
    ...actions,
  };
};

// the nearest tray scope for triggers and navigation hooks
export const useTrayScope = () => useContext(TrayScopeContext);

// normalized options of the current step subtree
export const useTrayStepOptions = () =>
  useContext(TrayStepOptionsContext);

export {
  DEFAULT_TRAY_STEP_OPTIONS,
  resolveTrayStepOptions,
} from "./tray-step-options";
