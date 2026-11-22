import { type TrayRegistration } from "../../tray-context";
import type { PresentedPreloadedStep } from "../types";
import { resolveContextualStepOptions } from "./step-options";
import { stepHasFooter } from "./step-footers";

export const NO_PRELOADED_STEPS: readonly PresentedPreloadedStep[] = [];

export const preloadCapableBySteps = new WeakMap<
  TrayRegistration["steps"],
  boolean
>();

export type TrayStepDescriptor = TrayRegistration["steps"][number];

export const canPreloadStep = (
  step: TrayStepDescriptor | undefined,
): step is TrayStepDescriptor =>
  step !== undefined && step.options?.preload !== false;

// fixed per registration, a tray with a preloadable step renders keyed layers so the content tree keeps its shape
export const isPreloadCapable = (registration: TrayRegistration) => {
  const cached = preloadCapableBySteps.get(registration.steps);

  if (cached !== undefined) {
    return cached;
  }

  const capable =
    registration.steps.length > 1 && registration.steps.some(canPreloadStep);
  preloadCapableBySteps.set(registration.steps, capable);
  return capable;
};

// the next and previous steps stay rendered hidden so moving either way reuses them, opted-out steps mount on the tap
export const resolvePreloadedSteps = (
  rootTrayId: string,
  registration: TrayRegistration,
  trayIndex: number,
): readonly PresentedPreloadedStep[] => {
  const neighbours = [
    registration.steps[trayIndex + 1],
    registration.steps[trayIndex - 1],
  ].filter(canPreloadStep);

  if (neighbours.length === 0) {
    return NO_PRELOADED_STEPS;
  }

  return neighbours.map((step) => ({
    trayId: `${rootTrayId}-${step.key}`,
    header: step.header ?? null,
    content: step.content,
    stepOptions: resolveContextualStepOptions(
      step,
      stepHasFooter(registration, step),
    ),
  }));
};
