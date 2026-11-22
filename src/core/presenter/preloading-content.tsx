import React, { Activity } from "react";
import type { PresentedPreloadedStep } from "../../runtime/presenter/types";
import {
  TrayStepLayerProvider,
  TrayStepOptionsProvider,
} from "../../runtime/tray-context";
import type { ResolvedTrayStepOptions } from "../../runtime/types";
import { TrayRevealedStepContent } from "../../tray-step-content";
import { TrayContentFooterSlot } from "../step-footer";
import {
  useLeftLayer,
  useSettledLayers,
  TrayHiddenLayerContent,
  type LeftStep,
} from "./preloading-layers";
import { type PreloadingContentCurrentStep } from "./preloading-layers-types";
export { resolveTrayHeaderLayerKey, resolveTrayHeaderInstanceKey, resolveRenderedPreloadedHeaders, TrayPreloadingHeader } from "./preloading-header";
export type { PreloadingContentCurrentStep } from "./preloading-layers-types";

// the step being left stays out of the hidden set until its transition completes so its exiting animation runs, generation 0 holds it out until the next step change
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
  // layers share element types and step keys so a hidden layer becomes the current one, the animated wrapper sits outside the Activity
  <TrayRevealedStepContent
    key={trayId}
    stepKey={trayId}
    scale={stepOptions.scale}
    anchorScaleToTop={anchorScaleToTop}
    fullScreenBoundaryExit={fullScreenBoundaryExit}
    skipEntering={skipEntering}
    hidden={mode === "hidden"}
  >
    <Activity mode={mode}>
      <TrayStepLayerProvider value={trayId}>
        <TrayStepOptionsProvider value={stepOptions}>
          <TrayHiddenLayerContent hidden={mode === "hidden"}>
            {content}
          </TrayHiddenLayerContent>
        </TrayStepOptionsProvider>
      </TrayStepLayerProvider>
    </Activity>
    {/* an entering footer renders with its step's content, see step-footer.tsx */}
    <TrayStepOptionsProvider value={stepOptions}>
      <TrayContentFooterSlot trayId={trayId} />
    </TrayStepOptionsProvider>
  </TrayRevealedStepContent>
);

// the current step plus hidden neighbours that a step change reuses instead of mounting
export const TrayPreloadingContent = ({
  current,
  preloaded,
}: {
  current: PreloadingContentCurrentStep;
  preloaded: readonly PresentedPreloadedStep[];
}) => {
  const { left, completedGeneration, settled } = useLeftLayer(current.trayId);
  const hiddenSteps = useSettledLayers(
    resolveRenderedPreloadedSteps(
      preloaded,
      current.trayId,
      left,
      completedGeneration,
    ).map((step) => ({ key: step.trayId, step })),
    settled,
  ).map((layer) => layer.step);

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
