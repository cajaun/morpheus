import { useCallback, useEffect } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import type {
  SharedValue,
} from "react-native-reanimated";
import type {
  TrayTransitionContract,
  TrayTransitionLifecycle,
} from "../../runtime/types";
import { reportTrayTransitionPhase } from "../../runtime/transition-lifecycle-bridge";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import {
  markTrayStepRenderedCommit,
} from "../../telemetry/tray-step-timing";
import { markTrayBoundaryRenderedCommit } from "../../telemetry/tray-boundary-timing";
import { log } from "../logger";

type Params = {
  fullScreen?: boolean;
  isEnteringFullScreen: boolean;
  measuredContentHeight: SharedValue<number>;
  layoutEnabled: boolean;
  presentationContentHeight: SharedValue<number>;
  presentationFooterHeight: SharedValue<number>;
  renderedFullScreen: boolean;
  renderedTrayId?: string;
  renderedTransitionContract?: TrayTransitionContract | null;
  resolvedContentHeight: SharedValue<number>;
  rootTrayId?: string;
  trayId?: string;
  transitionContract?: TrayTransitionContract | null;
  transitionLifecycle?: TrayTransitionLifecycle;
  visible: boolean;
};

// transition diagnostics keep lifecycle traces beside their state owners
export const useTrayTransitionDiagnostics = ({
  fullScreen,
  isEnteringFullScreen,
  measuredContentHeight,
  layoutEnabled,
  presentationContentHeight,
  presentationFooterHeight,
  renderedFullScreen,
  renderedTrayId,
  renderedTransitionContract,
  resolvedContentHeight,
  rootTrayId,
  trayId,
  transitionContract,
  transitionLifecycle,
  visible,
}: Params) => {
  const markLiveTransitionPhase = useCallback(
    (
      phase: "prepared" | "committed" | "layoutStarted" | "completed",
      details?: Record<string, unknown>,
      at?: number,
    ) => {
      const generation = transitionContract?.generation;

      if (generation === undefined) {
        return;
      }

      reportTrayTransitionPhase({
        lifecycle: transitionLifecycle,
        generation,
        phase,
        source: "Tray.Diagnostics",
        details,
        at,
      });
    },
    [transitionContract?.generation, transitionLifecycle],
  );

  const markPreparedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("prepared", details);
    },
    [markLiveTransitionPhase],
  );
  const markCommittedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("committed", details);
    },
    [markLiveTransitionPhase],
  );
  const markStartedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("layoutStarted", details);
    },
    [markLiveTransitionPhase],
  );
  const markCompletedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("completed", details);
    },
    [markLiveTransitionPhase],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    log("FULLSCREEN TRANSITION STATE", {
      trayId,
      visible,
      incomingFullScreen: !!fullScreen,
      renderedFullScreen,
      isEnteringFullScreen,
      renderedTrayId,
      measuredContentHeight: measuredContentHeight.value,
      resolvedContentHeight: resolvedContentHeight.value,
      contentHeight: presentationContentHeight.value,
      footerHeight: presentationFooterHeight.value,
      layoutEnabled,
    });
  }, [
    fullScreen,
    isEnteringFullScreen,
    layoutEnabled,
    measuredContentHeight,
    presentationContentHeight,
    presentationFooterHeight,
    renderedFullScreen,
    renderedTrayId,
    resolvedContentHeight,
    trayId,
    visible,
  ]);

  useProfiledTrayLayoutEffect("useTrayTransitionDiagnostics.markRenderCommit", () => {
    if (
      renderedTransitionContract &&
      renderedTransitionContract.boundary !== "opening" &&
      renderedTransitionContract.boundary !== "closing"
    ) {
      reportTrayTransitionPhase({
        lifecycle: transitionLifecycle,
        generation: renderedTransitionContract.generation,
        phase: "committed",
        source: "Tray.RenderCommit",
        details: { trayId: renderedTrayId },
      });
    }

    if (!isTrayInstrumentationEnabled()) {
      return;
    }

    markTrayStepRenderedCommit(
      rootTrayId,
      renderedTrayId,
      renderedTransitionContract?.generation,
    );
    markTrayBoundaryRenderedCommit(
      rootTrayId,
      renderedTransitionContract,
      renderedTrayId,
    );
  }, [
    renderedTrayId,
    renderedTransitionContract,
    rootTrayId,
    transitionLifecycle,
  ]);

  return {
    markPreparedTransition,
    markCommittedTransition,
    markStartedTransition,
    markCompletedTransition,
    markLiveTransitionPhase,
  };
};
