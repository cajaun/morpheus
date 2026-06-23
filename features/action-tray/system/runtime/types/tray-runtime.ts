import type React from "react";
import type { RefObject } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

// keep runtime contracts separate from context hook implementation
export type TrayFullScreenCloseBehavior = "dismiss" | "returnToShell";
export type TrayFullScreenTransition = "morph" | "slide";
export type TrayOpenTransition = "slide" | "expandFromTrigger";
export type TrayCloseTransition = "slide" | "collapseToTrigger";

export type TrayTransitionOptions = {
  open?: TrayOpenTransition;
  close?: TrayCloseTransition;
  origin?: "screenBottom" | "fullScreenFooter";
};

export type TrayStepOptions = {
  scale?: boolean;
  keyboardAware?: boolean;
  fullScreen?: boolean;
  shouldScaleBackground?: boolean;
  fullScreenBackgroundScale?: number;
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
  dismissible?: boolean;
  transition?: TrayTransitionOptions;
  pages?: TrayPagesRegistration;
};

export type TrayStackEntry = {
  trayId: string;
  index: number;
  parentTrayId?: string | null;
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
  progress: SharedValue<number>;
};

export type ResolvedTrayStepOptions = {
  hasFooter: boolean;
  scale: boolean;
  keyboardAware: boolean;
  fullScreen: boolean;
  shouldScaleBackground: boolean;
  fullScreenBackgroundScale: number;
  fullScreenDraggable: boolean;
  fullScreenCloseBehavior: TrayFullScreenCloseBehavior;
  fullScreenTransition: TrayFullScreenTransition;
  fullScreenSafeAreaTop: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

export type TrayHostStateValue = {
  registry: Record<string, TrayRegistration>;
  activeTrayId: string | null;
  activeIndex: number;
  stack: TrayStackEntry[];
  keyboardHeight: SharedValue<number>;
};

export type TrayHostActionsValue = {
  registerTray: (id: string, registration: TrayRegistration) => void;
  unregisterTray: (id: string) => void;
  registerTrayPages: (id: string, pages: TrayPagesRegistration | null) => void;
  openTray: (id: string) => void;
  openNestedTray: (
    id: string,
    parentTrayId?: string | null,
  ) => void;
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
