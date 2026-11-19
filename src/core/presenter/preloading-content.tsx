import React, { Activity, useContext, useMemo, useState } from "react";
import type {
  PresentedPreloadedStep,
} from "../../runtime/presenter/types";
import {
  TrayParentTransitionContext,
  useParentCompletedGeneration,
} from "../../runtime/tray-parent-transition";
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

// Track the layer being left (by its key) and the transition that left it,
// so the caller can hold it out until that transition completes.
const useLeftLayer = (currentKey: string) => {
  const parentTransition = useContext(TrayParentTransitionContext);
  const completedGeneration = useParentCompletedGeneration();
  const [previousKey, setPreviousKey] = useState(currentKey);
  const [left, setLeft] = useState<LeftStep | null>(null);

  if (previousKey !== currentKey) {
    // derived state: remember the layer being left, and by which transition
    setPreviousKey(currentKey);
    setLeft({
      trayId: previousKey,
      generation: parentTransition?.generation ?? 0,
    });
  }

  // the transition into the current layer has finished (or has nothing to
  // wait for)
  const settled =
    parentTransition == null ||
    parentTransition.generation <= 0 ||
    completedGeneration >= parentTransition.generation;

  return { left, completedGeneration, settled };
};

const NO_LAYER_KEYS: readonly string[] = [];

// Render newly needed hidden layers only once the current transition has
// finished. Rendering them right after a step change would put their render,
// commit and native view creation in the window where the sheet is waiting
// for its layout to start, delaying the motion. Layers already rendered stay.
const useSettledLayers = <T extends { key: string }>(
  candidates: readonly T[],
  settled: boolean,
) => {
  const [renderedKeys, setRenderedKeys] =
    useState<readonly string[]>(NO_LAYER_KEYS);
  const layers = settled
    ? candidates
    : candidates.filter((layer) => renderedKeys.includes(layer.key));

  if (
    layers.length !== renderedKeys.length ||
    layers.some((layer, index) => layer.key !== renderedKeys[index])
  ) {
    // derived state: remember which hidden layers are rendered
    setRenderedKeys(layers.map((layer) => layer.key));
  }

  return layers;
};

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
  // The animated wrapper stays outside the <Activity> (see
  // TrayRevealedStepContent); only the step's content is hidden.
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
          {content}
        </TrayStepOptionsProvider>
      </TrayStepLayerProvider>
    </Activity>
  </TrayRevealedStepContent>
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

// Headers stay mounted across steps that share a header mode: sheet steps
// share one header (its title and actions animate inside it), and fullscreen
// steps share another. Only a change between the two swaps the whole header,
// so that is the header worth preloading: a neighbour whose header is in the
// other mode is kept rendered, hidden. A header instance is identified by its
// mode and the step it was entered at, so a hidden header is only reused for
// the step it was rendered for, never re-rendered with another step's header
// in the commit that reveals it.
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
      // same mode as the current step: it shares the current header
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

// A hidden header must not run its title/action entering animations while it
// is preloaded; the whole header is revealed on show instead, which is also
// how a header animates across a fullscreen boundary.
const HIDDEN_HEADER_TRANSITION = {
  skipEntering: true,
  fullScreenBoundaryExit: false,
} as const;

const TrayHeaderLayer = ({
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
              {header}
            </TrayHeaderTransitionProvider>
          </TrayStepOptionsProvider>
        </TrayStepLayerProvider>
      </Activity>
    </TrayRevealedStepContent>
  );
};

// Header for a tray with preload steps: the current header plus, for each
// neighbouring step whose header is in the other mode, that header rendered
// hidden so crossing the fullscreen boundary (either way) reuses it.
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
  // the step this header mode was entered at; steps of the same mode that
  // follow keep that header instance (and animate their titles inside it)
  const [entered, setEntered] = useState({
    layerKey: currentLayerKey,
    trayId: current.trayId,
  });

  if (entered.layerKey !== currentLayerKey) {
    // derived state: crossed into the other header mode at this step
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
