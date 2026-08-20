import type {
  TrayPresentationEndpoint,
  TrayTransitionContract,
} from "../../runtime/types";

export const describeTrayEndpoint = (
  endpoint: TrayPresentationEndpoint | null | undefined,
) =>
  endpoint
    ? {
        trayId: endpoint.trayId,
        stepIndex: endpoint.stepIndex,
        stepKey: endpoint.stepKey,
        pageIndex: endpoint.pageIndex,
        mode: endpoint.mode,
      }
    : null;

export const describeTrayTransition = (
  transition: TrayTransitionContract | null | undefined,
) =>
  transition
    ? {
        generation: transition.generation,
        reason: transition.reason,
        direction: transition.direction,
        boundary: transition.boundary,
        stepChanged: transition.stepChanged,
        pageChanged: transition.pageChanged,
        fullScreenChanged: transition.fullScreenChanged,
        from: describeTrayEndpoint(transition.from),
        to: describeTrayEndpoint(transition.to),
      }
    : null;
