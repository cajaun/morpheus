import type { TrayTransitionOptions } from "../../runtime/tray-context";

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
  fullScreen: boolean;
  visible: boolean;
  originProgress: AnimatedValue<number>;
  transition?: TrayTransitionOptions;
};

export type ActionTrayAnimationState = {
  bottom: number;
  fullScreen: boolean;
  originProgress: AnimatedValue<number>;
  shouldUseOriginTransition: boolean;
};
