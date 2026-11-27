import React, { useContext, useState } from "react";
import {
  TrayParentTransitionContext,
  useParentCompletedGeneration,
} from "../../runtime/tray-parent-transition";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";

export type LeftStep = {
  trayId: string;
  generation: number;
};

// track the layer being left and the transition that left it
export const useLeftLayer = (currentKey: string) => {
  const parentTransition = useContext(TrayParentTransitionContext);
  const completedGeneration = useParentCompletedGeneration();
  const [previousKey, setPreviousKey] = useState(currentKey);
  const [left, setLeft] = useState<LeftStep | null>(null);

  if (previousKey !== currentKey) {
    // derived state, the layer being left and the transition that left it
    setPreviousKey(currentKey);
    setLeft({
      trayId: previousKey,
      generation: parentTransition?.generation ?? 0,
    });
  }

  // the transition into the current layer finished or has nothing to wait for
  const settled =
    parentTransition == null ||
    parentTransition.generation <= 0 ||
    completedGeneration >= parentTransition.generation;

  return { left, completedGeneration, settled };
};

export const NO_LAYER_KEYS: readonly string[] = [];

// new hidden layers render after the current transition finishes so their work stays out of the window before the layout starts
export const useSettledLayers = <T extends { key: string }>(
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
    // derived state, the hidden layers currently rendered
    setRenderedKeys(layers.map((layer) => layer.key));
  }

  return layers;
};

// a hidden Activity defers effects, so hidden content holds its element and the latest content renders in a layout effect after reveal
export const TrayHiddenLayerContent = ({
  hidden,
  children,
}: {
  hidden: boolean;
  children: React.ReactNode;
}) => {
  const [held, setHeld] = useState(() => ({ hidden, children }));

  // derived state, hiding captures the latest content
  if (hidden && !held.hidden) {
    setHeld({ hidden: true, children });
  }

  const revealing = !hidden && held.hidden;

  useProfiledTrayLayoutEffect("core/presenter/preloading-layers#1", () => {
    if (revealing) {
      setHeld({ hidden: false, children });
    }
  }, [children, revealing]);

  return hidden || revealing ? held.children : children;
};
