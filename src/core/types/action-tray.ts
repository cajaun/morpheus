import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type {
  KeyboardTransitionMode,
  TrayTransitionContract,
  TrayTransitionLifecycle,
  TrayTransitionOptions,
} from "../../runtime/types";
export type { KeyboardTransitionMode } from "../../runtime/types";

// describe the shell payload after the presenter resolves a step
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
  keyboardAware?: boolean;
  fullScreen?: boolean;
  fullScreenBackgroundScale?: number;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  dismissible?: boolean;
  transition?: TrayTransitionOptions;
  transitionContract?: TrayTransitionContract | null;
  transitionLifecycle?: TrayTransitionLifecycle;
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

// lease one concrete sheet endpoint so fullscreen geometry cannot become sheet layout authority
export type ActionTraySheetFrame = {
  endpointKey: string;
  generation: number;
  totalHeight: number;
  // body height is captured with the frame so the inner viewport can be synchronously bounded before its animated boundary style runs
  contentHeight: number;
};

export type RenderedTrayState = {
  header: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  trayId?: string;
  keyboardAware?: boolean;
  fullScreen?: boolean;
  fullScreenBackgroundScale?: number;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  transitionContract?: TrayTransitionContract | null;
};

export type MeasurementState = {
  layoutEnabled: boolean;
  footerMeasured: boolean;
  contentMeasured: boolean;
  pendingOpen: boolean;
};
