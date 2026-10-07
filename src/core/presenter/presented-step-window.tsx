import React, {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet } from "react-native";
import { TrayStepContent } from "../../tray-step-content";
import {
  TrayScopeProvider,
  TrayStepOptionsProvider,
} from "../../runtime/tray-context";
import type {
  ResolvedTrayStepOptions,
  TrayTransitionContract,
} from "../../runtime/types";

// A resolved step layer is deliberately internal. Consumers continue to
// provide ordinary Tray.Step children; the presenter owns layer lifetime.
export type PresentedStepLayer = {
  key: string;
  rootTrayId: string;
  content: ReactNode;
  stepOptions: ResolvedTrayStepOptions;
  fullScreenBoundaryExit: boolean;
  isFirstRender: boolean;
  transitionContract: TrayTransitionContract | null;
  scale: boolean;
  anchorScaleToTop: boolean;
};

type Props = {
  active: PresentedStepLayer;
  region: "header" | "content";
};

const isStepTransition = (layer: PresentedStepLayer) => {
  const transition = layer.transitionContract;

  return (
    transition?.stepChanged === true &&
    transition.from?.trayId === layer.rootTrayId &&
    transition.from.stepKey !== layer.key
  );
};

// Keep the shell's React identity stable while allowing the body/header to
// overlap as two bounded layers during a step transition.
export const PresentedStepWindow: React.FC<Props> = ({ active, region }) => {
  const activeLayerRef = useRef(active);
  const outgoingLayerRef = useRef<PresentedStepLayer | null>(null);
  const [, setReleaseVersion] = useState(0);

  const previousActive = activeLayerRef.current;
  const changedStep =
    previousActive.key !== active.key ||
    previousActive.rootTrayId !== active.rootTrayId;

  if (changedStep) {
    outgoingLayerRef.current =
      previousActive.rootTrayId === active.rootTrayId &&
      isStepTransition(active)
        ? previousActive
        : null;
  } else if (!isStepTransition(active)) {
    // An interrupted/non-animated update must not retain a stale layer.
    outgoingLayerRef.current = null;
  }

  activeLayerRef.current = active;

  const releaseOutgoing = useCallback((layerKey: string) => {
    if (outgoingLayerRef.current?.key !== layerKey) {
      return;
    }

    outgoingLayerRef.current = null;
    setReleaseVersion((version) => version + 1);
  }, []);

  const outgoing = outgoingLayerRef.current;
  const outgoingStyle =
    region === "content" || region === "header"
      ? StyleSheet.absoluteFillObject
      : undefined;

  return (
    <>
      {outgoing ? (
        <React.Fragment key={`outgoing-${outgoing.key}`}>
          <TrayScopeProvider value={outgoing.rootTrayId}>
            <TrayStepOptionsProvider value={outgoing.stepOptions}>
              <TrayStepContent
                key={`outgoing-${outgoing.key}`}
                stepKey={outgoing.key}
                scale={outgoing.scale}
                anchorScaleToTop={outgoing.anchorScaleToTop}
                fullScreenBoundaryExit={outgoing.fullScreenBoundaryExit}
                skipEntering
                pointerEvents="none"
                style={outgoingStyle}
                onExitComplete={() => releaseOutgoing(outgoing.key)}
              >
                {outgoing.content}
              </TrayStepContent>
            </TrayStepOptionsProvider>
          </TrayScopeProvider>
        </React.Fragment>
      ) : null}

      <React.Fragment key={`active-${active.key}`}>
        <TrayScopeProvider value={active.rootTrayId}>
          <TrayStepOptionsProvider value={active.stepOptions}>
            <TrayStepContent
              key={`active-${active.key}`}
              stepKey={active.key}
              scale={active.scale}
              anchorScaleToTop={active.anchorScaleToTop}
              fullScreenBoundaryExit={active.fullScreenBoundaryExit}
              skipEntering={active.isFirstRender}
              // The outgoing slot owns exit animation and release. This
              // prevents React from starting a second exit for the active slot.
              skipExiting
            >
              {active.content}
            </TrayStepContent>
          </TrayStepOptionsProvider>
        </TrayScopeProvider>
      </React.Fragment>
    </>
  );
};

PresentedStepWindow.displayName = "PresentedStepWindow";
