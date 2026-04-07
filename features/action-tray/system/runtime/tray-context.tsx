import React, { createContext, useContext } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export type TrayFullScreenCloseBehavior = "dismiss" | "returnToShell";
export type TrayFullScreenTransition = "morph" | "slide";

export type TrayStepOptions = {
  scale?: boolean;
  fullScreen?: boolean;
  fullScreenDraggable?: boolean;
  fullScreenCloseBehavior?: TrayFullScreenCloseBehavior;
  fullScreenTransition?: TrayFullScreenTransition;
  style?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

export type TrayStepDefinition = {
  key: string;
  content: React.ReactNode;
  options?: TrayStepOptions;
};

export type TrayRegistration = {
  steps: TrayStepDefinition[];
  footer?: React.ReactNode;
};

export type ResolvedTrayStepOptions = {
  scale: boolean;
  fullScreen: boolean;
  fullScreenDraggable: boolean;
  fullScreenCloseBehavior: TrayFullScreenCloseBehavior;
  fullScreenTransition: TrayFullScreenTransition;
  style?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

export const DEFAULT_TRAY_STEP_OPTIONS: ResolvedTrayStepOptions = {
  scale: true,
  fullScreen: false,
  fullScreenDraggable: true,
  fullScreenCloseBehavior: "dismiss",
  fullScreenTransition: "morph",
  style: undefined,
  className: undefined,
  footerStyle: undefined,
  footerClassName: undefined,
};

export const resolveTrayStepOptions = (
  options?: TrayStepOptions,
): ResolvedTrayStepOptions => ({
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

const TrayHostStateContext = createContext<TrayHostStateValue | null>(null);
const TrayHostActionsContext = createContext<TrayHostActionsValue | null>(null);
const TrayScopeContext = createContext<string | null>(null);
const TrayStepOptionsContext =
  createContext<ResolvedTrayStepOptions>(DEFAULT_TRAY_STEP_OPTIONS);

export const TrayHostStateProvider = TrayHostStateContext.Provider;
export const TrayHostActionsProvider = TrayHostActionsContext.Provider;
export const TrayScopeProvider = TrayScopeContext.Provider;
export const TrayStepOptionsProvider = TrayStepOptionsContext.Provider;

export const useTrayHostState = () => {
  const ctx = useContext(TrayHostStateContext);

  if (!ctx) {
    throw new Error("Must be used within TrayProvider");
  }

  return ctx;
};

export const useTrayHostActions = () => {
  const ctx = useContext(TrayHostActionsContext);

  if (!ctx) {
    throw new Error("Must be used within TrayProvider");
  }

  return ctx;
};

export const useTrayHost = () => {
  const state = useTrayHostState();
  const actions = useTrayHostActions();

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
  const { registry, activeTrayId, activeIndex } = useTrayHostState();
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

  const registration = registry[trayId];
  const total = registration?.steps.length ?? 0;
  const isActive = activeTrayId === trayId;
  const index = isActive ? clampIndex(activeIndex, total) : 0;

  return {
    trayId,
    isActive,
    index,
    total,
    canGoNext: index < total - 1,
    canGoBack: index > 0,
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
        nextStep();
      }
    },
    back: () => {
      if (isActive) {
        previousStep();
      }
    },
    anticipateKeyboard,
    dismissKeyboard: () => dismissKeyboardForTray(trayId),
  };
};
