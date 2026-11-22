import React, { Activity, useMemo, useState } from "react";
import type { PresentedPreloadedStep } from "../../runtime/presenter/types";
import {
  TrayStepLayerProvider,
  TrayStepOptionsProvider,
} from "../../runtime/tray-context";
import type { ResolvedTrayStepOptions } from "../../runtime/types";
import { TrayRevealedStepContent } from "../../tray-step-content";
import {
  TrayHeaderTransitionProvider,
  type TrayHeaderTransitionValue,
} from "../../primitives/header-transition-context";
import {
  useLeftLayer,
  useSettledLayers,
  TrayHiddenLayerContent,
  type LeftStep,
} from "./preloading-layers";
import { type PreloadingContentCurrentStep } from "./preloading-layers-types";

// sheet steps share one header and fullscreen steps another, so the other mode's header is preloaded per neighbour step
export const resolveTrayHeaderLayerKey = (fullScreen: boolean) =>
  fullScreen ? "fullscreen-header" : "fixed-header";

export const resolveTrayHeaderInstanceKey = (
  layerKey: string,
  trayId: string,
) => `${layerKey}#${trayId}`;

export const resolveRenderedPreloadedHeaders = (
  preloaded: readonly PresentedPreloadedStep[],
  currentLayerKey: string,
  left: LeftStep | null,
  completedGeneration: number,
) => {
  const layers: {
    key: string;
    layerKey: string;
    step: PresentedPreloadedStep;
  }[] = [];

  for (const step of preloaded) {
    const layerKey = resolveTrayHeaderLayerKey(step.stepOptions.fullScreen);
    const key = resolveTrayHeaderInstanceKey(layerKey, step.trayId);

    if (
      step.header == null ||
      // same mode as the current step, it shares the current header
      layerKey === currentLayerKey ||
      (left !== null &&
        key === left.trayId &&
        (left.generation <= 0 || completedGeneration < left.generation))
    ) {
      continue;
    }

    layers.push({ key, layerKey, step });
  }

  return layers;
};

// a hidden header skips its title and action entering animations and the whole header reveals on show
export const HIDDEN_HEADER_TRANSITION = {
  skipEntering: true,
  fullScreenBoundaryExit: false,
} as const;

export const TrayHeaderLayer = ({
  layerKey,
  trayId,
  header,
  stepOptions,
  fullScreenBoundaryExit,
  skipEntering,
  hidden,
}: {
  layerKey: string;
  trayId: string;
  header: React.ReactNode;
  stepOptions: ResolvedTrayStepOptions;
  fullScreenBoundaryExit: boolean;
  skipEntering: boolean;
  hidden: boolean;
}) => {
  const transitionValue = useMemo<TrayHeaderTransitionValue>(
    () =>
      hidden
        ? { stepKey: trayId, ...HIDDEN_HEADER_TRANSITION }
        : { stepKey: trayId, skipEntering, fullScreenBoundaryExit },
    [fullScreenBoundaryExit, hidden, skipEntering, trayId],
  );
  return (
    <TrayRevealedStepContent
      stepKey={layerKey}
      scale={false}
      fullScreenBoundaryExit={hidden ? false : fullScreenBoundaryExit}
      skipEntering={hidden ? false : skipEntering}
      hidden={hidden}
    >
      <Activity mode={hidden ? "hidden" : "visible"}>
        <TrayStepLayerProvider value={trayId}>
          <TrayStepOptionsProvider value={stepOptions}>
            <TrayHeaderTransitionProvider value={transitionValue}>
              <TrayHiddenLayerContent hidden={hidden}>
                {header}
              </TrayHiddenLayerContent>
            </TrayHeaderTransitionProvider>
          </TrayStepOptionsProvider>
        </TrayStepLayerProvider>
      </Activity>
    </TrayRevealedStepContent>
  );
};

// the current header plus hidden headers of neighbours in the other mode
export const TrayPreloadingHeader = ({
  current,
  preloaded,
}: {
  current: Omit<PreloadingContentCurrentStep, "content"> & {
    header: React.ReactNode;
  };
  preloaded: readonly PresentedPreloadedStep[];
}) => {
  const currentLayerKey = resolveTrayHeaderLayerKey(current.fullScreen);
  // the step this header mode was entered at, later steps of the same mode keep that header instance
  const [entered, setEntered] = useState({
    layerKey: currentLayerKey,
    trayId: current.trayId,
  });

  if (entered.layerKey !== currentLayerKey) {
    // derived state, crossed into the other header mode at this step
    setEntered({ layerKey: currentLayerKey, trayId: current.trayId });
  }

  const currentKey = resolveTrayHeaderInstanceKey(
    currentLayerKey,
    entered.layerKey === currentLayerKey ? entered.trayId : current.trayId,
  );
  const { left, completedGeneration, settled } = useLeftLayer(currentKey);
  const hiddenHeaders = useSettledLayers(
    resolveRenderedPreloadedHeaders(
      preloaded,
      currentLayerKey,
      left,
      completedGeneration,
    ),
    settled,
  );

  return [
    current.header == null ? null : (
      <TrayHeaderLayer
        key={currentKey}
        layerKey={currentLayerKey}
        trayId={current.trayId}
        header={current.header}
        stepOptions={current.stepOptions}
        fullScreenBoundaryExit={current.fullScreenBoundaryExit}
        skipEntering={current.isFirstRender}
        hidden={false}
      />
    ),
    ...hiddenHeaders.map(({ key, layerKey, step }) => (
      <TrayHeaderLayer
        key={key}
        layerKey={layerKey}
        trayId={step.trayId}
        header={step.header}
        stepOptions={step.stepOptions}
        fullScreenBoundaryExit={false}
        skipEntering={false}
        hidden
      />
    )),
  ];
};
