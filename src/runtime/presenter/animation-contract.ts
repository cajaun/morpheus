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

// a transition counts when its target matches the rendered endpoint
const transitionTargetsPresentation = (
  transition: TrayTransitionContract | null,
  endpoint: TrayPresentationEndpoint,
) => {
  if (
    transition?.to?.trayId !== endpoint.trayId ||
    transition.to.stepIndex !== endpoint.stepIndex ||
    transition.to.mode !== endpoint.mode
  ) {
    return false;
  }

  // a missing page index stays provisional while page registration catches up
  if (
    transition.reason !== "pageChange" &&
    transition.to.pageIndex === undefined
  ) {
    return true;
  }

  return transition.to.pageIndex === endpoint.pageIndex;
};

// whether neighbouring steps cross a fullscreen boundary
export const hasAdjacentFullScreenBoundary = (
  registration: TrayRegistration,
  stepIndex: number,
) => {
  const step = registration.steps[stepIndex];

  if (!step) {
    return false;
  }

  const fullScreen = step.options?.fullScreen ?? false;

  const previousStep = registration.steps[stepIndex - 1];
  if (
    previousStep !== undefined &&
    (previousStep.options?.fullScreen ?? false) !== fullScreen
  ) {
    return true;
  }

  const nextStep = registration.steps[stepIndex + 1];
  return (
    nextStep !== undefined &&
    (nextStep.options?.fullScreen ?? false) !== fullScreen
  );
};

// content animation policy from registration and transition state
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
  // the established visual policy holds while the transition also carries the navigation edge
  fullScreenBoundaryExit: hasAdjacentFullScreenBoundary(
    registration,
    endpoint.stepIndex,
  ),
});
