import type React from "react";
import type { RefObject } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { TrayTransitionContract } from "./tray-transition";
import type { TrayTransitionLifecycle } from "./tray-transition";

// retained as a public compatibility type; transition contracts now carry the
// immutable keyboard ownership decision directly.
export type KeyboardTransitionMode = "idle" | "entering" | "exiting";

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
  /**
   * Keep this step rendered, hidden, while it is the next or previous step,
   * so moving to it (forward or back) reuses the rendered step instead of
   * mounting it on the tap. The hidden step renders at low priority after the
   * current step is on screen, and its effects run only once it is shown
   * (React `<Activity>`). Applies to sheet and fullscreen steps. On by
   * default; set `false` to mount the step on the tap instead.
   */
  preload?: boolean;
};

export type TrayStepProps = {
  children: React.ReactNode;
  options?: TrayStepOptions;
};

export type TrayStepDefinition = {
  key: string;
  header?: React.ReactNode;
  content: React.ReactNode;
  // A footer authored inside the step. It enters and leaves with the step;
  // consecutive steps whose footers share `footerId` keep one footer layer.
  footer?: React.ReactNode;
  footerId?: string;
  options?: TrayStepOptions;
};

export type TrayRegistration = {
  steps: TrayStepDefinition[];
  footer?: React.ReactNode;
  dismissible?: boolean;
  transition?: TrayTransitionOptions;
  pages?: TrayPagesRegistration;
  /** Owning tray scope for an internally registered nested tray. */
  parentTrayId?: string;
  /**
   * Internal: the nested tray is registered and can open, but its hidden
   * prepared host is not built yet. Set while the parent's transition is
   * still running so the host mount stays off that transition's critical path.
   */
  deferHostPreparation?: boolean;
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
  preload: boolean;
};

export type TrayHostStateValue = {
  registry: Record<string, TrayRegistration>;
  activeTrayId: string | null;
  activeIndex: number;
  stack: TrayStackEntry[];
  transitionGeneration: number;
  // retained descriptor used by the presenter lifecycle activity is exposed separately by traytransitionlifecyclegetactive()
  lastTransition: TrayTransitionContract | null;
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
  requestPageTransition: (
    trayId: string,
    stepKey: string,
    fromPageIndex: number,
    toPageIndex: number,
  ) => number | null;
  anticipateKeyboard: () => void;
  prepareKeyboardHandoff: () => void;
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
  transitions: TrayTransitionLifecycle;
  setDependencies: (params: {
    anticipateKeyboard: () => void;
    prepareKeyboardHandoff: () => void;
    dismissFocusedInputs: (trayId?: string | null) => void | Promise<void>;
    registerFocusable: TrayHostActionsValue["registerFocusable"];
  }) => void;
};
