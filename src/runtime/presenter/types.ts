import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type {
  ResolvedTrayStepOptions,
  TrayTransitionContract,
  TrayTransitionOptions,
} from "../types";

// describe resolved payloads after runtime state becomes presentable shell props
// A step kept rendered, hidden, so moving to it does not mount it.
export type PresentedPreloadedStep = {
  trayId: string;
  header: ReactNode;
  content: ReactNode;
  stepOptions: ResolvedTrayStepOptions;
};

export type PresentedTray = {
  rootTrayId: string;
  trayId: string;
  keyboardAware?: boolean;
  // Capabilities are fixed for a registration so optional motion hosts never
  // switch component types during a step transition.
  keyboardStickyCapable?: boolean;
  fullScreenMotionCapable?: boolean;
  stepOptions: ResolvedTrayStepOptions;
  header: ReactNode;
  content: ReactNode;
  footer: ReactNode;
  fullScreenBoundaryExit: boolean;
  isFirstRender: boolean;
  fullScreen: boolean;
  fullScreenBackgroundScale: number;
  fullScreenSafeAreaTop: boolean;
  fullScreenDraggable: boolean;
  dismissible: boolean;
  transitionContract: TrayTransitionContract | null;
  transition?: TrayTransitionOptions;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  stackIndex: number;
  visible: boolean;
  interactive: boolean;
  // Fixed per registration: the tray has at least one preload step, so its
  // content renders as keyed layers that a preloaded step can be reused from.
  preloadCapable?: boolean;
  // Steps currently kept rendered, hidden (the next step, when it preloads).
  preloadedSteps?: readonly PresentedPreloadedStep[];
};

export type TrayHostSlot = {
  assignmentId: number;
  payload: PresentedTray | null;
  visible: boolean;
  interactive: boolean;
  // A prepared slot owns a mounted host but is not part of the presented stack.
  // It is reused for the next root tray instead of mounting the controller on
  // the trigger's critical path.
  prepared?: boolean;
};

export type PresentedTrayProps = {
  payload: PresentedTray;
  assignmentId: number;
  prepared?: boolean;
  onRequestClose: () => void;
  onCloseComplete: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
};

export type PresentedTrayRenderer = ComponentType<PresentedTrayProps>;
