// identify sheet frames by endpoint and generation
import type { TrayPresentationEndpoint } from "../../runtime/types";
import type { ActionTraySheetFrame } from "../types/action-tray";

// build a stable key from the endpoint fields that identify one sheet frame
export const createTrayEndpointKey = (
  endpoint: TrayPresentationEndpoint,
) =>
  [
    endpoint.trayId,
    endpoint.stepKey,
    endpoint.pageIndex ?? "step",
    endpoint.mode,
  ].join("::");

// resolve the key for an optional transition endpoint
export const resolveTransitionEndpointKey = (
  endpoint: TrayPresentationEndpoint | null | undefined,
) => (endpoint ? createTrayEndpointKey(endpoint) : undefined);

// accept a frame only when its generation belongs to either transition endpoint
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
