import type { TrayPresentationEndpoint } from "../../runtime/types";
import type { ActionTraySheetFrame } from "../types/action-tray";

export const createTrayEndpointKey = (
  endpoint: TrayPresentationEndpoint,
) =>
  [
    endpoint.trayId,
    endpoint.stepKey,
    endpoint.pageIndex ?? "step",
    endpoint.mode,
  ].join("::");

export const resolveTransitionEndpointKey = (
  endpoint: TrayPresentationEndpoint | null | undefined,
) => (endpoint ? createTrayEndpointKey(endpoint) : undefined);

export const isSheetFrameForTransition = (
  frame: ActionTraySheetFrame | undefined,
  transitionGeneration: number | undefined,
  sourceKey?: string,
  targetKey?: string,
) => {
  if (
    !frame ||
    transitionGeneration === undefined ||
    frame.generation !== transitionGeneration
  ) {
    return false;
  }

  return frame.endpointKey === sourceKey || frame.endpointKey === targetKey;
};
