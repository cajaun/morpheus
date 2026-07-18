import { resolveTrayStepOptions } from "../tray-step-options";
import type {
  TrayPresentationEndpoint,
  TrayRegistration,
  TrayTransitionContract,
} from "../types";

export type TrayAnimationContract = {
  transition: TrayTransitionContract | null;
  isFirstRender: boolean;
  fullScreenBoundaryExit: boolean;
};

const transitionTargetsPresentation = (
  transition: TrayTransitionContract | null,
  endpoint: TrayPresentationEndpoint,
) =>
  transition?.to?.trayId === endpoint.trayId &&
  transition.to.stepIndex === endpoint.stepIndex &&
  transition.to.pageIndex === endpoint.pageIndex;

// Preserve the current animation policy while making its topology dependency
// explicit. This intentionally checks both neighboring definitions because that
// is how existing tray boundary exits behave today.
export const hasAdjacentFullScreenBoundary = (
  registration: TrayRegistration,
  stepIndex: number,
) => {
  const step = registration.steps[stepIndex];

  if (!step) {
    return false;
  }

  const fullScreen = resolveTrayStepOptions(step.options).fullScreen;

  return [stepIndex - 1, stepIndex + 1].some((adjacentIndex) => {
    const adjacentStep = registration.steps[adjacentIndex];

    return (
      adjacentStep !== undefined &&
      resolveTrayStepOptions(adjacentStep.options).fullScreen !== fullScreen
    );
  });
};

export const resolveTrayAnimationContract = ({
  registration,
  endpoint,
  previousIndex,
  transition,
}: {
  registration: TrayRegistration;
  endpoint: TrayPresentationEndpoint;
  previousIndex?: number;
  transition: TrayTransitionContract | null;
}): TrayAnimationContract => ({
  transition: transitionTargetsPresentation(transition, endpoint)
    ? transition
    : null,
  isFirstRender: previousIndex === undefined,
  // Keep the established visual policy exact while the real navigation edge is
  // now also available through transition.
  fullScreenBoundaryExit: hasAdjacentFullScreenBoundary(
    registration,
    endpoint.stepIndex,
  ),
});
