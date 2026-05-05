import React, {
  createContext,
  RefObject,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

// store scope and step options are separate concerns so they get separate contexts
export type TrayFullScreenCloseBehavior = "dismiss" | "returnToShell";
export type TrayFullScreenTransition = "morph" | "slide";

export type TrayStepOptions = {
  scale?: boolean;
  keyboardAware?: boolean;
  fullScreen?: boolean;
  fullScreenDraggable?: boolean;
  fullScreenCloseBehavior?: TrayFullScreenCloseBehavior;
  fullScreenTransition?: TrayFullScreenTransition;
  fullScreenSafeAreaTop?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

export type TrayStepDefinition = {
  key: string;
  header?: React.ReactNode;
  content: React.ReactNode;
  options?: TrayStepOptions;
};

export type TrayRegistration = {
  steps: TrayStepDefinition[];
  footer?: React.ReactNode;
  pages?: TrayPagesRegistration;
};

export type TrayPagesRegistration = {
  stepKey: string;
  pageIndex: number;
  totalPages: number;
  hasFooter: boolean;
  canGoNext: boolean;
  canGoBack: boolean;
  nextPage: () => void;
  backPage: () => void;
  setPage: (index: number) => void;
};

export type ResolvedTrayStepOptions = {
  scale: boolean;
  keyboardAware: boolean;
  fullScreen: boolean;
  fullScreenDraggable: boolean;
  fullScreenCloseBehavior: TrayFullScreenCloseBehavior;
  fullScreenTransition: TrayFullScreenTransition;
  fullScreenSafeAreaTop: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

export const DEFAULT_TRAY_STEP_OPTIONS: ResolvedTrayStepOptions = {
  scale: true,
  keyboardAware: false,
  fullScreen: false,
  fullScreenDraggable: true,
  fullScreenCloseBehavior: "dismiss",
  fullScreenTransition: "morph",
  fullScreenSafeAreaTop: false,
  style: undefined,
  className: undefined,
  footerStyle: undefined,
  footerClassName: undefined,
};

export const resolveTrayStepOptions = (
  options?: TrayStepOptions,
): ResolvedTrayStepOptions => ({
  // downstream code should never branch on missing option fields
  ...DEFAULT_TRAY_STEP_OPTIONS,
  ...options,
});

export type TrayHostStateValue = {
  registry: Record<string, TrayRegistration>;
  activeTrayId: string | null;
  activeIndex: number;
  keyboardHeight: SharedValue<number>;
};

export type TrayHostActionsValue = {
  registerTray: (id: string, registration: TrayRegistration) => void;
  unregisterTray: (id: string) => void;
  registerTrayPages: (id: string, pages: TrayPagesRegistration | null) => void;
  openTray: (id: string) => void;
  closeActiveTray: () => void;
  requestCloseActiveTray: () => void;
  nextStep: () => void;
  previousStep: () => void;
  anticipateKeyboard: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
  registerFocusable: (
    trayId: string,
    ref: React.RefObject<any>,
  ) => () => void;
};

export type TrayRuntimeStore = {
  getState: () => TrayHostStateValue;
  subscribe: (listener: () => void) => () => void;
  actions: TrayHostActionsValue;
  justOpenedRef: RefObject<boolean>;
  setDependencies: (params: {
    keyboardHeight: SharedValue<number>;
    anticipateKeyboard: () => void;
    dismissFocusedInputs: (trayId?: string | null) => void | Promise<void>;
    registerFocusable: TrayHostActionsValue["registerFocusable"];
  }) => void;
};

const TrayStoreContext = createContext<TrayRuntimeStore | null>(null);
const TrayScopeContext = createContext<string | null>(null);
const TrayStepOptionsContext =
  createContext<ResolvedTrayStepOptions>(DEFAULT_TRAY_STEP_OPTIONS);

export const TrayStoreProvider = TrayStoreContext.Provider;
export const TrayScopeProvider = TrayScopeContext.Provider;
export const TrayStepOptionsProvider = TrayStepOptionsContext.Provider;

export const useTrayRuntimeStore = () => {
  const ctx = useContext(TrayStoreContext);

  if (!ctx) {
    throw new Error("Must be used within TrayProvider");
  }

  return ctx;
};

export const useTrayHostSelector = <T,>(
  selector: (state: TrayHostStateValue) => T,
) => {
  const store = useTrayRuntimeStore();
  // selectors avoid rerendering every tray consumer on unrelated store changes
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

export const useTrayHostActions = () => {
  return useTrayRuntimeStore().actions;
};

export const useTrayHost = () => {
  const state = useTrayHostState();
  const actions = useTrayHostActions();

  // this merged hook is mostly for tests tooling and low level integrations
  return {
    ...state,
    ...actions,
  };
};

export const useTrayScope = () => useContext(TrayScopeContext);

export const useTrayStepOptions = () => useContext(TrayStepOptionsContext);

const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

export const useTrayFlow = () => {
  const trayId = useTrayScope();
  // flow state is scoped to the nearest root so nested trays do not collide
  const registration = useTrayHostSelector((state) =>
    trayId ? state.registry[trayId] : undefined,
  );
  const activeTrayId = useTrayHostSelector((state) => state.activeTrayId);
  const activeIndex = useTrayHostSelector((state) => state.activeIndex);
  const {
    openTray,
    closeActiveTray,
    requestCloseActiveTray,
    nextStep,
    previousStep,
    anticipateKeyboard,
    dismissKeyboardForTray,
  } = useTrayHostActions();

  if (!trayId) {
    throw new Error("Must be used within Tray.Root scope");
  }

  const total = registration?.steps.length ?? 0;
  const isActive = activeTrayId === trayId;
  const activeStep = registration?.steps[clampIndex(activeIndex, total)];
  const pageControls =
    activeStep &&
    registration?.pages?.stepKey === activeStep.key &&
    !registration.pages.hasFooter
      ? registration.pages
      : null;
  const index = isActive ? clampIndex(activeIndex, total) : 0;
  const canGoNext = pageControls ? pageControls.canGoNext : index < total - 1;
  const canGoBack = pageControls ? pageControls.canGoBack : index > 0;

  return {
    trayId,
    isActive,
    index,
    total,
    canGoNext,
    canGoBack,
    open: () => openTray(trayId),
    close: () => {
      if (isActive) {
        closeActiveTray();
      }
    },
    requestClose: () => {
      if (isActive) {
        requestCloseActiveTray();
      }
    },
    next: () => {
      if (isActive) {
        if (pageControls?.canGoNext) {
          pageControls.nextPage();
          return;
        }

        nextStep();
      }
    },
    back: () => {
      if (isActive) {
        if (pageControls?.canGoBack) {
          pageControls.backPage();
          return;
        }

        previousStep();
      }
    },
    anticipateKeyboard,
    dismissKeyboard: () => dismissKeyboardForTray(trayId),
  };
};
