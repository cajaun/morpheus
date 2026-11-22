import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import type {
  TrayTransitionContract,
  TrayTransitionLifecycle,
  TrayTransitionOptions,
} from "../../runtime/types";
export type { KeyboardTransitionMode } from "../../runtime/types";

// shell payload after the presenter resolves a step
export type TrayProps = {
  assignmentId?: number;
  prepared?: boolean;
  visible: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  onClose: () => void;
  onCloseComplete?: () => void;
  rootTrayId?: string;
  content?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  keyboardAware?: boolean;
  /** @internal registration-wide keyboard motion capability */
  keyboardStickyCapable?: boolean;
  /** @internal registration-wide fullscreen boundary motion capability */
  fullScreenMotionCapable?: boolean;
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
  dismissKeyboard: () => void;
};

export type TrayRef = {
  open: () => void;
  close: () => void;
  isActive: () => boolean;
};

// lease one sheet endpoint so fullscreen geometry never becomes sheet layout authority
export type TraySheetFrame = {
  endpointKey: string;
  generation: number;
  totalHeight: number;
  // body height captured with the frame so the inner viewport bounds before its animated style runs
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
