import { DEFAULT_FULL_SCREEN_BACKGROUND_SCALE } from "../core/constants";
import type {
  ResolvedTrayStepOptions,
  TrayStepOptions,
} from "./types";

// normalize optional step configuration before the presenter reads it
export const DEFAULT_TRAY_STEP_OPTIONS: ResolvedTrayStepOptions = {
  hasFooter: false,
  scale: true,
  keyboardAware: false,
  fullScreen: false,
  shouldScaleBackground: false,
  fullScreenBackgroundScale: 1,
  fullScreenDraggable: true,
  fullScreenCloseBehavior: "dismiss",
  fullScreenTransition: "morph",
  fullScreenSafeAreaTop: false,
  style: undefined,
  className: undefined,
  footerStyle: undefined,
  footerClassName: undefined,
};

export const resolveTrayStepOptions = (
  options?: TrayStepOptions,
): ResolvedTrayStepOptions => {
  const requestedBackgroundScale = options?.fullScreenBackgroundScale;
  const fullScreen =
    options?.fullScreen ?? DEFAULT_TRAY_STEP_OPTIONS.fullScreen;
  const shouldScaleBackground =
    fullScreen &&
    (options?.shouldScaleBackground ??
      DEFAULT_TRAY_STEP_OPTIONS.shouldScaleBackground);
  const resolvedBackgroundScale =
    shouldScaleBackground &&
    requestedBackgroundScale !== undefined &&
    Number.isFinite(requestedBackgroundScale) &&
    requestedBackgroundScale >= 0
      ? requestedBackgroundScale
      : shouldScaleBackground
        ? DEFAULT_FULL_SCREEN_BACKGROUND_SCALE
        : 1;

  return {
    // fill every option so callers never branch on missing fields
    ...DEFAULT_TRAY_STEP_OPTIONS,
    ...options,
    fullScreen,
    shouldScaleBackground,
    fullScreenBackgroundScale: resolvedBackgroundScale,
  };
};
