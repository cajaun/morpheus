import {
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
} from "../constants";
import type {
  TrayAnimatedStyleParams,
  TrayAnimationState,
} from "./tray-animated-style-types";

export const EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT / 2;

export const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING =
  TRAY_FOOTER_PADDING_TOP;

export const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT +
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING +
  TRAY_FOOTER_PADDING_BOTTOM;

export type TrayFrameStyleParams = Pick<
  TrayAnimatedStyleParams,
  | "contentHeight"
  | "footerHeight"
  | "fullScreenBoundaryTransition"
  | "fullScreenBoundarySourceFullScreen"
  | "fullScreenBoundaryTargetFullScreen"
  | "hasFooter"
  | "transitionStartedGeneration"
  | "transitionLayoutStartedGeneration"
  | "transitionCompletedGeneration"
  | "transition"
  | "surfaceOpacity"
> &
  TrayAnimationState;
