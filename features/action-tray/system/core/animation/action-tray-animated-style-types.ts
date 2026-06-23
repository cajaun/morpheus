import type { TrayTransitionOptions } from "../../runtime/tray-context";

// share animated style contracts across frame drag and visibility hooks
type AnimatedValue<T> = {
  value: T;
};

export type ActionTrayAnimatedStyleParams = {
  translateY: AnimatedValue<number>;
  contentHeight: AnimatedValue<number>;
  hasFooter: AnimatedValue<boolean>;
  surfaceOpacity: AnimatedValue<number>;
  footerHeight: AnimatedValue<number>;
  keyboardHeight: AnimatedValue<number>;
  frameFullScreen: boolean;
  fullScreen: boolean;
  preparedSheetFrameHeight?: number;
  useMeasuredSheetHeight: boolean;
  visible: boolean;
  layoutEnabled: boolean;
  originProgress: AnimatedValue<number>;
  transition?: TrayTransitionOptions;
};

export type ActionTrayAnimationState = {
  bottom: number;
  fullScreen: boolean;
  originProgress: AnimatedValue<number>;
  preparedSheetFrameHeight?: number;
  shouldUseOriginTransition: boolean;
  useMeasuredSheetHeight: boolean;
};
