import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type {
  KeyboardTransitionMode,
  ResolvedTrayStepOptions,
  TrayTransitionContract,
  TrayTransitionOptions,
} from "../types";

// describe resolved payloads after runtime state becomes presentable shell props
export type PresentedTray = {
  rootTrayId: string;
  trayId: string;
  keyboardTransitionMode: KeyboardTransitionMode;
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

export type TrayKeyboardHeight = SharedValue<number>;

export type PresentedActionTrayProps = {
  payload: PresentedTray;
  assignmentId: number;
  keyboardHeight: TrayKeyboardHeight;
  onRequestClose: () => void;
  onCloseComplete: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
};

export type PresentedActionTrayRenderer = ComponentType<PresentedActionTrayProps>;
