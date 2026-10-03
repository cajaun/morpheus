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

// context exposes stable runtime services without mixing them with navigation policy
const TrayStoreContext = createContext<TrayRuntimeStore | null>(null);
const TrayScopeContext = createContext<string | null>(null);
const TrayStepOptionsContext =
  createContext<ResolvedTrayStepOptions>(DEFAULT_TRAY_STEP_OPTIONS);

export const TrayStoreProvider = TrayStoreContext.Provider;
export const TrayScopeProvider = TrayScopeContext.Provider;
export const TrayStepOptionsProvider = TrayStepOptionsContext.Provider;

// require the runtime store from the nearest provider
export const useTrayRuntimeStore = () => {
  const store = useContext(TrayStoreContext);

  if (!store) {
    throw new Error("Must be used within TrayProvider");
  }

  return store;
};

// subscribe to one stable selection from the external tray store
export const useTrayHostSelector = <T,>(
  selector: (state: TrayHostStateValue) => T,
) => {
  const store = useTrayRuntimeStore();
  const selectedSnapshotRef = useRef<{
    state: TrayHostStateValue;
    selector: (state: TrayHostStateValue) => T;
    value: T;
  } | null>(null);

  // cache each selector result for one store snapshot this satisfies usesyncexternalstore's stable-snapshot requirement even for object selectors
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

// read the complete host state for low level integrations
export const useTrayHostState = () => useTrayHostSelector((state) => state);

// expose imperative host actions without subscribing to state changes
export const useTrayHostActions = () => useTrayRuntimeStore().actions;

// expose lifecycle records to diagnostics and integration code
export const useTrayTransitionLifecycle = () =>
  useTrayRuntimeStore().transitions;

// combine host state and actions for the public convenience hook
export const useTrayHost = () => {
  const state = useTrayHostState();
  const actions = useTrayHostActions();

  // this merged hook supports tests and low level integrations
  return {
    ...state,
    ...actions,
  };
};

// read the nearest tray scope used by triggers and navigation hooks
export const useTrayScope = () => useContext(TrayScopeContext);

// read normalized options for the current tray step subtree
export const useTrayStepOptions = () =>
  useContext(TrayStepOptionsContext);

export {
  DEFAULT_TRAY_STEP_OPTIONS,
  resolveTrayStepOptions,
} from "./tray-step-options";
