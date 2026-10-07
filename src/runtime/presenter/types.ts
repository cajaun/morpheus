import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type {
  ResolvedTrayStepOptions,
  TrayTransitionContract,
  TrayTransitionOptions,
} from "../types";

// describe resolved payloads after runtime state becomes presentable shell props
export type PresentedTray = {
  rootTrayId: string;
  trayId: string;
  keyboardAware?: boolean;
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
};

export type TrayHostSlot = {
  assignmentId: number;
  payload: PresentedTray | null;
  visible: boolean;
  interactive: boolean;
};

export type PresentedTrayProps = {
  payload: PresentedTray;
  assignmentId: number;
  onRequestClose: () => void;
  onCloseComplete: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
};

export type PresentedTrayRenderer = ComponentType<PresentedTrayProps>;
