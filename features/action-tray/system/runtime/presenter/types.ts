import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { KeyboardTransitionMode } from "../../core/types";
import type { TrayTransitionOptions } from "../types";

// describe resolved payloads after runtime state becomes presentable shell props
export type PresentedTray = {
  rootTrayId: string;
  trayId: string;
  keyboardTransitionMode: KeyboardTransitionMode;
  header: ReactNode;
  content: ReactNode;
  footer: ReactNode;
  fullScreen: boolean;
  fullScreenBackgroundScale: number;
  fullScreenSafeAreaTop: boolean;
  fullScreenDraggable: boolean;
  dismissible: boolean;
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
