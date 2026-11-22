import { createContext, useContext } from "react";
import type { TrayTransitionContract } from "../runtime/types";
import {
  FULL_SCREEN_BOUNDARY_CONTENT_SCALE,
  MORPH_ENTERING_SCALE,
  MORPH_EXITING_SCALE,
} from "./constants";

export type TrayContentMotionDirection = -1 | 1;

export const FORWARD_CONTENT_MOTION: TrayContentMotionDirection = 1;
export const BACKWARD_CONTENT_MOTION: TrayContentMotionDirection = -1;

// a fullscreen boundary exit comes from the active transition contract so ordinary reversals keep their direction
export const resolveActiveFullScreenBoundaryExit = (
  configuredBoundaryExit: boolean,
  fullScreenChanged: boolean,
) => {
  "worklet";

  return configuredBoundaryExit && fullScreenChanged;
};

// content motion direction from the navigation direction
export const resolveTrayContentMotionDirection = (
  transition: TrayTransitionContract | null | undefined,
): TrayContentMotionDirection =>
  transition?.direction === "backward"
    ? BACKWARD_CONTENT_MOTION
    : FORWARD_CONTENT_MOTION;

// scale of content entering a transition
export const resolveMorphEnteringScale = ({
  scale,
  synchronizedFullScreen,
  direction,
}: {
  scale: boolean;
  synchronizedFullScreen: boolean;
  direction: TrayContentMotionDirection;
}) => {
  "worklet";

  if (synchronizedFullScreen || !scale) {
    return FULL_SCREEN_BOUNDARY_CONTENT_SCALE;
  }

  return direction === BACKWARD_CONTENT_MOTION
    ? MORPH_EXITING_SCALE
    : MORPH_ENTERING_SCALE;
};

// scale of content leaving a transition
export const resolveMorphExitingScale = ({
  scale,
  fullScreenBoundaryExit,
  direction,
}: {
  scale: boolean;
  fullScreenBoundaryExit: boolean;
  direction: TrayContentMotionDirection;
}) => {
  "worklet";

  if (fullScreenBoundaryExit || !scale) {
    return FULL_SCREEN_BOUNDARY_CONTENT_SCALE;
  }

  return direction === BACKWARD_CONTENT_MOTION
    ? MORPH_ENTERING_SCALE
    : MORPH_EXITING_SCALE;
};

const TrayContentMotionDirectionContext =
  createContext<TrayContentMotionDirection | null>(null);

export const TrayContentMotionDirectionProvider =
  TrayContentMotionDirectionContext.Provider;

// one direction value for every content animation participant
export const useTrayContentMotionDirection = () =>
  useContext(TrayContentMotionDirectionContext);
