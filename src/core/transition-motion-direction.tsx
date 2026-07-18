import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { TrayTransitionContract } from "../runtime/types";
import {
  MORPH_ENTERING_SCALE,
  MORPH_EXITING_SCALE,
} from "./constants";

export type TrayContentMotionDirection = -1 | 1;

export const FORWARD_CONTENT_MOTION: TrayContentMotionDirection = 1;
export const BACKWARD_CONTENT_MOTION: TrayContentMotionDirection = -1;

export const resolveTrayContentMotionDirection = (
  transition: TrayTransitionContract | null | undefined,
): TrayContentMotionDirection =>
  transition?.boundary === "sheetToSheet" &&
  transition.direction === "backward"
    ? BACKWARD_CONTENT_MOTION
    : FORWARD_CONTENT_MOTION;

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
    return 1;
  }

  return direction === BACKWARD_CONTENT_MOTION
    ? MORPH_EXITING_SCALE
    : MORPH_ENTERING_SCALE;
};

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
    return 1;
  }

  return direction === BACKWARD_CONTENT_MOTION
    ? MORPH_ENTERING_SCALE
    : MORPH_EXITING_SCALE;
};

const TrayContentMotionDirectionContext =
  createContext<SharedValue<TrayContentMotionDirection> | null>(null);

export const TrayContentMotionDirectionProvider =
  TrayContentMotionDirectionContext.Provider;

export const useTrayContentMotionDirection = () =>
  useContext(TrayContentMotionDirectionContext);
