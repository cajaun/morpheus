import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export type ActionTrayProps = {
  visible: boolean;
  style?: StyleProp<ViewStyle>;
  onClose: () => void;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenDraggable?: boolean;
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
  content: React.ReactNode;
  footer: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
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
