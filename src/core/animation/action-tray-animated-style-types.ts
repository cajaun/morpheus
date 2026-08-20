import type { TrayTransitionOptions } from "../../runtime/types";
import type { ActionTraySheetFrame } from "../types/action-tray";

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
  preparedSheetFrame?: ActionTraySheetFrame;
  transitionGeneration?: number;
  transitionSourceKey?: string;
  transitionTargetKey?: string;
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
  preparedSheetFrame?: ActionTraySheetFrame;
  transitionGeneration?: number;
  transitionSourceKey?: string;
  transitionTargetKey?: string;
  shouldUseOriginTransition: boolean;
};
