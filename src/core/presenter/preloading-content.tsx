import React, { Activity, useContext, useState } from "react";
import type {
  PresentedPreloadedStep,
} from "../../runtime/presenter/types";
import {
  TrayParentTransitionContext,
  useParentCompletedGeneration,
} from "../../runtime/tray-parent-transition";
import { TrayStepOptionsProvider } from "../../runtime/tray-context";
import type { ResolvedTrayStepOptions } from "../../runtime/types";
import { TrayRevealedStepContent } from "../../tray-step-content";

export type PreloadingContentCurrentStep = {
  trayId: string;
  content: React.ReactNode;
  stepOptions: ResolvedTrayStepOptions;
  fullScreen: boolean;
  fullScreenBoundaryExit: boolean;
  isFirstRender: boolean;
};

type LeftStep = {
  trayId: string;
  generation: number;
};

// Which preloaded steps to keep rendered. The step just left is held out until
// the transition that left it completes: it must be removed (so its exiting
// animation runs) rather than hidden (which would make it vanish instantly).
// A transition without a completion signal (generation 0) keeps it held out
// until the next step change, which only costs a remount later.
export const resolveRenderedPreloadedSteps = (
  preloaded: readonly PresentedPreloadedStep[],
  currentTrayId: string,
  left: LeftStep | null,
  completedGeneration: number,
) =>
  preloaded.filter(
    (step) =>
      step.trayId !== currentTrayId &&
      !(
        left !== null &&
        step.trayId === left.trayId &&
        (left.generation <= 0 || completedGeneration < left.generation)
      ),
  );

const renderLayer = (
  trayId: string,
  mode: "visible" | "hidden",
  content: React.ReactNode,
  stepOptions: ResolvedTrayStepOptions,
  anchorScaleToTop: boolean,
  fullScreenBoundaryExit: boolean,
  skipEntering: boolean,
) => (
  // Every layer has the same element types and is keyed by its step, so the
  // hidden layer of the next step is the same instance once it is current.
  <Activity key={trayId} mode={mode}>
    <TrayStepOptionsProvider value={stepOptions}>
      <TrayRevealedStepContent
        stepKey={trayId}
        scale={stepOptions.scale}
        anchorScaleToTop={anchorScaleToTop}
        fullScreenBoundaryExit={fullScreenBoundaryExit}
        skipEntering={skipEntering}
      >
        {content}
      </TrayRevealedStepContent>
    </TrayStepOptionsProvider>
  </Activity>
);

// Content for a tray with preload steps: the current step plus the steps kept
// rendered, hidden, so moving to them reuses them instead of mounting them.
// Hidden layers take no space (display: none), render at low priority after
// the visible content, and run their effects only once shown.
export const TrayPreloadingContent = ({
  current,
  preloaded,
}: {
  current: PreloadingContentCurrentStep;
  preloaded: readonly PresentedPreloadedStep[];
}) => {
  const parentTransition = useContext(TrayParentTransitionContext);
  const completedGeneration = useParentCompletedGeneration();
  const [previousTrayId, setPreviousTrayId] = useState(current.trayId);
  const [left, setLeft] = useState<LeftStep | null>(null);

  if (previousTrayId !== current.trayId) {
    // derived state: remember the step being left, and by which transition
    setPreviousTrayId(current.trayId);
    setLeft({
      trayId: previousTrayId,
      generation: parentTransition?.generation ?? 0,
    });
  }

  const hiddenSteps = resolveRenderedPreloadedSteps(
    preloaded,
    current.trayId,
    left,
    completedGeneration,
  );

  return [
    renderLayer(
      current.trayId,
      "visible",
      current.content,
      current.stepOptions,
      current.fullScreen,
      current.fullScreenBoundaryExit,
      current.isFirstRender,
    ),
    ...hiddenSteps.map((step) =>
      renderLayer(
        step.trayId,
        "hidden",
        step.content,
        step.stepOptions,
        false,
        false,
        false,
      ),
    ),
  ];
};
