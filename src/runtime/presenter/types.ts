import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type {
  ResolvedTrayStepOptions,
  TrayTransitionContract,
  TrayTransitionOptions,
} from "../types";

// a step kept rendered and hidden so moving to it mounts nothing
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
  // capabilities are fixed per registration so motion hosts never switch component types mid-transition
  keyboardStickyCapable?: boolean;
  fullScreenMotionCapable?: boolean;
  stepOptions: ResolvedTrayStepOptions;
  header: ReactNode;
  content: ReactNode;
  footer: ReactNode;
  // footer of the current step for trays with step footer layers, footer above is then null
  stepFooter?: ReactNode;
  stepFooterKey?: string | null;
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
  // fixed per registration, content renders as keyed layers a preloaded step reuses
  preloadCapable?: boolean;
  // steps kept rendered and hidden
  preloadedSteps?: readonly PresentedPreloadedStep[];
};

export type TrayHostSlot = {
  assignmentId: number;
  payload: PresentedTray | null;
  visible: boolean;
  interactive: boolean;
  // a prepared slot owns a mounted host outside the presented stack, reused by the next root tray
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
