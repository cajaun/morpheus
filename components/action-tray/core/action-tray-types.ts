import React from "react";
import { StyleProp, ViewStyle } from "react-native";

export type ActionTrayProps = {
  visible: boolean;
  style?: StyleProp<ViewStyle>;
  onClose: () => void;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
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
};

export type MeasurementState = {
  layoutEnabled: boolean;
  footerMeasured: boolean;
  contentMeasured: boolean;
  pendingOpen: boolean;
};