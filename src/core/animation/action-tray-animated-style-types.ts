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
  preparedSheetFrameGeneration?: number;
  transitionGeneration?: number;
  useMeasuredSheetHeight: boolean;
  visible: boolean;
  layoutEnabled: boolean;
  originProgress: AnimatedValue<number>;
  morphProgress: AnimatedValue<number>;
  transitionStartedGeneration?: AnimatedValue<number>;
  transitionLayoutStartedGeneration?: AnimatedValue<number>;
  transitionCompletedGeneration?: AnimatedValue<number>;
  fullScreenBoundaryTransition: boolean;
  fullScreenBoundarySourceFullScreen?: boolean;
  fullScreenBoundaryTargetFullScreen?: boolean;
  transition?: TrayTransitionOptions;
};

export type ActionTrayAnimationState = {
  bottom: number;
  fullScreen: boolean;
  morphProgress: AnimatedValue<number>;
  originProgress: AnimatedValue<number>;
  preparedSheetFrameHeight?: number;
  preparedSheetFrameGeneration?: number;
  transitionGeneration?: number;
  shouldUseOriginTransition: boolean;
  useMeasuredSheetHeight: boolean;
};
