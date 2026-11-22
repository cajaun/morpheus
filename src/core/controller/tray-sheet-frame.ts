// sheet frames identified by endpoint and generation
import type { TrayPresentationEndpoint } from "../../runtime/types";
import type { TraySheetFrame } from "../types/tray";

// stable key from the endpoint fields that identify one sheet frame
export const createTrayEndpointKey = (
  endpoint: TrayPresentationEndpoint,
) =>
  [
    endpoint.trayId,
    endpoint.stepKey,
    endpoint.pageIndex ?? "step",
    endpoint.mode,
  ].join("::");

// key of an optional transition endpoint
export const resolveTransitionEndpointKey = (
  endpoint: TrayPresentationEndpoint | null | undefined,
) => (endpoint ? createTrayEndpointKey(endpoint) : undefined);

// a frame counts when its generation belongs to either transition endpoint
export const isSheetFrameForTransition = (
  frame: TraySheetFrame | undefined,
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
