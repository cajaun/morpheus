import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export type KeyboardTransitionMode = "idle" | "entering" | "exiting";

// these types describe the shell after the presenter resolves a step
export type ActionTrayProps = {
  assignmentId?: number;
  visible: boolean;
  interactive?: boolean;
  keyboardTransitionMode?: KeyboardTransitionMode;
  style?: StyleProp<ViewStyle>;
  onClose: () => void;
  onCloseComplete?: () => void;
  rootTrayId?: string;
  content?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  dismissible?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  keyboardHeight: SharedValue<number>;
  dismissKeyboard: () => void;
};

export type ActionTrayRef = {
  open: () => void;
  close: () => void;
  isActive: () => boolean;
};

export type RenderedTrayState = {
  header: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

export type MeasurementState = {
  layoutEnabled: boolean;
  footerMeasured: boolean;
  contentMeasured: boolean;
  pendingOpen: boolean;
};
